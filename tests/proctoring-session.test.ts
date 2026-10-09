import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FaceCounter } from '@/lib/proctoring/mediapipe';
import { buildEnvironment } from '@/lib/proctoring/capabilities';
import { ProctorSession, type SessionState } from '@/lib/proctoring/session';
import type { FaceCounterOptions } from '@/lib/proctoring/mediapipe';
import type { ProctorEvent } from '@/lib/proctoring/types';

class CountingTarget extends EventTarget {
  active = 0;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
    this.active += 1;
    super.addEventListener(type, listener, options);
  }
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) {
    this.active -= 1;
    super.removeEventListener(type, listener, options);
  }
}

class FakeTrack extends CountingTarget {
  stop = vi.fn();
}

function fakeStream(track: FakeTrack) {
  return { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
}

const env = buildEnvironment({
  userAgent: 'x',
  coarsePointer: false,
  viewportWidth: 1280,
  canCamera: true,
  canFullscreen: false,
  canWakeLock: true,
});

describe('ProctorSession lifecycle (stubbed browser)', () => {
  let doc: CountingTarget & { visibilityState: string; fullscreenElement: null; hasFocus: () => boolean };
  let win: CountingTarget;
  let track: FakeTrack;
  let wakeRelease: ReturnType<typeof vi.fn>;
  let getUserMedia: ReturnType<typeof vi.fn>;
  let video: { muted: boolean; playsInline: boolean; srcObject: unknown; play: () => Promise<void> };
  let counterOptions: FaceCounterOptions;
  let counter: { start: ReturnType<typeof vi.fn<FaceCounter['start']>>; stop: ReturnType<typeof vi.fn<FaceCounter['stop']>> };
  let batches: ProctorEvent[][];
  let states: Partial<SessionState>[];

  const makeSession = (startsOk = true) => {
    counter = { start: vi.fn<FaceCounter['start']>().mockResolvedValue(startsOk), stop: vi.fn<FaceCounter['stop']>() };
    return new ProctorSession({
      video: video as unknown as HTMLVideoElement,
      environment: env,
      onEvents: (batch) => {
        batches.push(batch);
      },
      onState: (patch) => states.push(patch),
      createCounter: (options) => {
        counterOptions = options;
        return counter;
      },
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    track = new FakeTrack();
    wakeRelease = vi.fn().mockResolvedValue(undefined);
    getUserMedia = vi.fn().mockResolvedValue(fakeStream(track));
    batches = [];
    states = [];
    video = { muted: false, playsInline: false, srcObject: null, play: () => Promise.resolve() };
    doc = Object.assign(new CountingTarget(), {
      visibilityState: 'visible',
      fullscreenElement: null,
      hasFocus: () => true,
    });
    win = new CountingTarget();
    vi.stubGlobal('document', doc);
    vi.stubGlobal('window', win);
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia },
      wakeLock: {
        request: vi.fn().mockResolvedValue({ release: wakeRelease, addEventListener: vi.fn() }),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('requests the front camera at ~320x240 without audio and mutes the video element', async () => {
    const session = makeSession();
    await session.start();
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
      audio: false,
    });
    expect(video.muted).toBe(true);
    expect(video.playsInline).toBe(true);
    await session.stop();
  });

  it('returns full when the detector runs, and stop() releases everything', async () => {
    const session = makeSession();
    expect(await session.start()).toBe('full');
    expect(doc.active).toBeGreaterThan(0);
    expect(win.active).toBeGreaterThan(0);

    await session.stop();
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(video.srcObject).toBeNull();
    expect(counter.stop).toHaveBeenCalledTimes(1);
    expect(wakeRelease).toHaveBeenCalledTimes(1);
    expect(doc.active).toBe(0);
    expect(win.active).toBe(0);
    expect(track.active).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(states.at(-1)).toMatchObject({ cameraActive: false, facesNow: null });
  });

  it('stop() is idempotent', async () => {
    const session = makeSession();
    await session.start();
    await Promise.all([session.stop(), session.stop()]);
    await session.stop();
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(counter.stop).toHaveBeenCalledTimes(1);
  });

  it('camera permission denied => mode none, no tracks, no throw', async () => {
    getUserMedia.mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
    const session = makeSession();
    expect(await session.start()).toBe('none');
    expect(states).toContainEqual(expect.objectContaining({ mode: 'none', error: 'NotAllowedError' }));
    expect(counter.start).not.toHaveBeenCalled();
    await session.stop();
    expect(doc.active).toBe(0);
  });

  it('detector unavailable at start => limited, visibility signals still work', async () => {
    const session = makeSession(false);
    expect(await session.start()).toBe('limited');
    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    vi.setSystemTime(4000);
    doc.visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    await session.stop();
    expect(batches.flat()).toEqual([{ kind: 'tab_hidden', atMs: 0, durationMs: 4000 }]);
  });

  it('detector reporting unavailable later downgrades to limited and logs one event', async () => {
    const session = makeSession();
    await session.start();
    counterOptions.onUnavailable('low-fps');
    expect(states.at(-1)).toMatchObject({ mode: 'limited', error: 'low-fps' });
    await session.stop();
    expect(batches.flat()).toEqual([{ kind: 'proctoring_unavailable', atMs: 0 }]);
  });

  it('track ended => camera_lost event and limited mode', async () => {
    const session = makeSession();
    await session.start();
    vi.setSystemTime(2500);
    track.dispatchEvent(new Event('ended'));
    expect(states.at(-1)).toMatchObject({ cameraActive: false, mode: 'limited' });
    await session.stop();
    expect(batches.flat()).toEqual([{ kind: 'camera_lost', atMs: 2500 }]);
  });

  it('batches events every 5s without waiting for stop, max 20 per batch', async () => {
    const session = makeSession();
    await session.start();
    for (let i = 0; i < 25; i++) {
      vi.setSystemTime(i * 2000);
      doc.dispatchEvent(new Event('copy'));
    }
    await vi.advanceTimersByTimeAsync(5000);
    expect(batches.map((b) => b.length)).toEqual([20, 5]);
    await session.stop();
  });

  it('copy and paste are recorded as copy_paste', async () => {
    const session = makeSession();
    await session.start();
    vi.setSystemTime(3000);
    doc.dispatchEvent(new Event('paste'));
    await session.stop();
    expect(batches.flat()).toEqual([{ kind: 'copy_paste', atMs: 3000 }]);
  });

  it('stop() during camera startup still releases the tracks that arrive late', async () => {
    let resolveCamera!: (stream: MediaStream) => void;
    getUserMedia.mockReturnValue(new Promise<MediaStream>((resolve) => (resolveCamera = resolve)));
    const session = makeSession();
    const started = session.start();
    await session.stop();
    resolveCamera(fakeStream(track));
    expect(await started).toBe('none');
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(counter.start).not.toHaveBeenCalled();
  });

  it('a failing send does not prevent cleanup', async () => {
    const session = new ProctorSession({
      video: video as unknown as HTMLVideoElement,
      environment: env,
      onEvents: () => Promise.reject(new Error('offline')),
      onState: () => undefined,
      createCounter: () => ({ start: () => Promise.resolve(true), stop: () => undefined }),
    });
    await session.start();
    doc.dispatchEvent(new Event('copy'));
    await expect(session.stop()).resolves.toBeUndefined();
    expect(track.stop).toHaveBeenCalled();
  });
});
