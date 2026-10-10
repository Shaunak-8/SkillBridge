import { EventBatcher } from './batching';
import { BATCH_INTERVAL_MS, CAMERA_CONSTRAINTS } from './constants';
import { ProctorEngine } from './engine';
import { createFaceCounter, type FaceCounter, type FaceCounterOptions } from './mediapipe';
import type { Environment, MaybePromise, ProctorEvent, ProctorMode } from './types';

export interface SessionState {
  mode: ProctorMode;
  cameraActive: boolean;
  facesNow: number | null;
  error: string | null;
}

export const INITIAL_SESSION_STATE: SessionState = { mode: 'none', cameraActive: false, facesNow: null, error: null };

export interface SessionOptions {
  video: HTMLVideoElement;
  environment: Environment;
  onEvents: (batch: ProctorEvent[]) => MaybePromise<void>;
  onState: (patch: Partial<SessionState>) => void;
  /** Epoch ms when the attempt started, so atMs matches the server clock. Defaults to now. */
  originEpochMs?: number;
  /** Test seam. */
  createCounter?: (options: FaceCounterOptions) => FaceCounter;
}

const PLAY_TIMEOUT_MS = 3000;

function stopTracks(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * Owns every browser resource of one proctored attempt: camera stream, listeners, wake lock,
 * detector and the event batcher. stop() releases all of them and is idempotent.
 * No frame is ever recorded, stored or sent: only ProctorEvent{kind, atMs, durationMs}.
 */
export class ProctorSession {
  private readonly engine: ProctorEngine;
  private readonly batcher: EventBatcher;
  private readonly origin: number;
  private readonly cleanups: Array<() => void> = [];
  private stream: MediaStream | null = null;
  private counter: FaceCounter | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  private stopped = false;
  private degraded = false;
  private pageHidden = false;
  private lastFaces: number | null = null;
  private stopPromise: Promise<void> | null = null;

  constructor(private readonly o: SessionOptions) {
    this.engine = new ProctorEngine(o.environment.profile);
    this.batcher = new EventBatcher(o.onEvents);
    this.origin = o.originEpochMs ?? Date.now();
  }

  private now(): number {
    return Math.max(0, Date.now() - this.origin);
  }

  async start(): Promise<ProctorMode> {
    const env = this.o.environment;
    if (env.profile.requireFullscreen) this.requestFullscreen(); // needs the click that called start()
    if (!env.canCamera) return this.noCamera('camera-unsupported');
    const stream = await this.openCamera();
    if (!stream) return 'none';
    if (this.stopped) {
      stopTracks(stream);
      return 'none';
    }
    this.stream = stream;
    await this.attachVideo(stream);
    this.listen(stream);
    void this.requestWakeLock();
    const flushTimer = setInterval(() => void this.flushEvents(), BATCH_INTERVAL_MS);
    this.cleanups.push(() => clearInterval(flushTimer));
    this.o.onState({ cameraActive: true, mode: 'limited', error: null });
    const detecting = await this.startCounter();
    const mode: ProctorMode = detecting && !this.degraded ? 'full' : 'limited';
    if (!this.stopped) this.o.onState({ mode });
    return mode;
  }

  stop(): Promise<void> {
    this.stopPromise ??= this.doStop();
    return this.stopPromise;
  }

  private async doStop(): Promise<void> {
    this.stopped = true;
    this.counter?.stop();
    this.counter = null;
    this.batcher.add(this.engine.finalize(this.now()));
    this.cleanups.splice(0).forEach((cleanup) => cleanup());
    stopTracks(this.stream);
    this.stream = null;
    this.o.video.srcObject = null;
    void this.releaseWakeLock();
    this.o.onState({ cameraActive: false, facesNow: null });
    try {
      await this.batcher.flush();
    } catch {
      /* events are advisory */
    }
  }

  private flushEvents(): Promise<void> {
    this.batcher.add(this.engine.drain());
    return this.batcher.flush();
  }

  private noCamera(error: string): ProctorMode {
    this.o.onState({ mode: 'none', cameraActive: false, error });
    return 'none';
  }

  private async openCamera(): Promise<MediaStream | null> {
    try {
      return await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
    } catch (error) {
      this.noCamera(error instanceof Error && error.name ? error.name : 'camera-error');
      return null;
    }
  }

  private async attachVideo(stream: MediaStream): Promise<void> {
    const video = this.o.video;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, PLAY_TIMEOUT_MS);
    });
    await Promise.race([video.play().catch(() => undefined), timeout]);
    clearTimeout(timer);
  }

  private async startCounter(): Promise<boolean> {
    const make = this.o.createCounter ?? createFaceCounter;
    const counter = make({
      fps: this.o.environment.profile.fps,
      onFaces: (faceCount) => {
        if (this.stopped) return;
        this.engine.feedFrame({ t: this.now(), faceCount });
        if (faceCount !== this.lastFaces) {
          this.lastFaces = faceCount;
          this.o.onState({ facesNow: faceCount });
        }
      },
      onUnavailable: (reason) => {
        if (this.stopped) return;
        this.degraded = true;
        this.engine.feedUnavailable(this.now());
        this.o.onState({ mode: 'limited', facesNow: null, error: reason });
      },
    });
    this.counter = counter;
    return counter.start(this.o.video);
  }

  private listen(stream: MediaStream): void {
    const isMobile = this.o.environment.profile.isMobile;
    const on = (target: EventTarget, type: string, handler: () => void) => {
      target.addEventListener(type, handler);
      this.cleanups.push(() => target.removeEventListener(type, handler));
    };

    const syncAway = () => {
      const hidden = this.pageHidden || document.visibilityState === 'hidden' || (!isMobile && !document.hasFocus());
      this.engine.feedVisibility({ t: this.now(), hidden });
    };
    on(document, 'visibilitychange', () => {
      this.pageHidden = false;
      syncAway();
      if (document.visibilityState === 'visible') void this.requestWakeLock();
    });
    on(window, 'pagehide', () => {
      this.pageHidden = true;
      syncAway();
    });
    on(window, 'pageshow', () => {
      this.pageHidden = false;
      syncAway();
    });
    if (!isMobile) {
      on(window, 'blur', syncAway);
      on(window, 'focus', syncAway);
      on(document, 'fullscreenchange', () =>
        this.engine.feedFullscreen({ t: this.now(), active: Boolean(document.fullscreenElement) }),
      );
    }
    for (const type of ['copy', 'cut', 'paste']) on(document, type, () => this.engine.feedCopyPaste(this.now()));

    for (const track of stream.getVideoTracks()) {
      on(track, 'ended', () => {
        this.engine.feedCameraLost(this.now());
        this.degraded = true;
        this.o.onState({ cameraActive: false, facesNow: null, mode: 'limited' });
      });
    }
  }

  private requestFullscreen(): void {
    try {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    } catch {
      /* fullscreen is optional */
    }
  }

  private async requestWakeLock(): Promise<void> {
    if (this.stopped || !this.o.environment.canWakeLock || this.wakeLock) return;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      if (this.stopped) {
        void sentinel.release().catch(() => undefined);
        return;
      }
      this.wakeLock = sentinel;
      sentinel.addEventListener('release', () => {
        if (this.wakeLock === sentinel) this.wakeLock = null;
      });
    } catch {
      /* wake lock is best effort */
    }
  }

  private async releaseWakeLock(): Promise<void> {
    const sentinel = this.wakeLock;
    this.wakeLock = null;
    try {
      await sentinel?.release();
    } catch {
      /* already released */
    }
  }
}
