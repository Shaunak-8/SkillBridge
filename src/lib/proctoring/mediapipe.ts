import type { FaceDetector } from '@mediapipe/tasks-vision';
import {
  DETECT_CANVAS_WIDTH,
  DETECTOR_INIT_TIMEOUT_MS,
  MEDIAPIPE_MODEL_PATH,
  MEDIAPIPE_WASM_PATH,
  MIN_ACCEPTABLE_FPS,
  WARMUP_MS,
} from './constants';

// IMPORTANT: this is the ONLY place the MediaPipe package is loaded, and only through a dynamic
// import() inside start(), so it never lands in a bundle unless the quiz page actually starts proctoring.
// Only type imports (erased at build time) are allowed at the top of this file.

export interface FaceCounterOptions {
  fps: number;
  /** Called once per processed frame with the number of faces found. */
  onFaces: (faceCount: number) => void;
  /** Called at most once, when detection cannot run or runs below the minimum frame rate. */
  onUnavailable: (reason: string) => void;
}

export interface FaceCounter {
  /** Resolves true when detection is running, false when it is unavailable (onUnavailable already called). */
  start(video: HTMLVideoElement): Promise<boolean>;
  stop(): void;
}

/** True when the measured detection rate is acceptable. Pure, unit tested. */
export function meetsMinFps(detections: number, elapsedMs: number, minFps = MIN_ACCEPTABLE_FPS): boolean {
  if (elapsedMs <= 0) return true;
  return detections / (elapsedMs / 1000) >= minFps;
}

type Delegate = 'GPU' | 'CPU';

async function createDetector(delegate: Delegate): Promise<FaceDetector> {
  const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);
  return FaceDetector.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MEDIAPIPE_MODEL_PATH, delegate },
    runningMode: 'VIDEO',
    minDetectionConfidence: 0.5,
  });
}

/** GPU first, CPU fallback. */
async function createDetectorWithFallback(): Promise<{ detector: FaceDetector; delegate: Delegate }> {
  try {
    return { detector: await createDetector('GPU'), delegate: 'GPU' };
  } catch {
    return { detector: await createDetector('CPU'), delegate: 'CPU' };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

export function createFaceCounter(options: FaceCounterOptions): FaceCounter {
  const intervalMs = 1000 / options.fps;
  let detector: FaceDetector | null = null;
  let delegate: Delegate = 'GPU';
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let reported = false;
  let canvas: HTMLCanvasElement | null = null;
  let warmupStart = 0;
  let warmupCount = 0;
  let warmedUp = false;

  const fail = (reason: string) => {
    if (reported) return;
    reported = true;
    stop();
    options.onUnavailable(reason);
  };

  function stop() {
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = null;
    try { detector?.close(); } catch { /* already closed */ }
    detector = null;
    canvas = null;
  }

  /** Draws a downscaled copy of the frame; the model input is tiny so this keeps CPU/GPU upload cheap. */
  function frameFor(video: HTMLVideoElement): HTMLCanvasElement | HTMLVideoElement {
    if (!video.videoWidth || !video.videoHeight) return video;
    if (video.videoWidth <= DETECT_CANVAS_WIDTH) return video;
    canvas ??= document.createElement('canvas');
    canvas.width = DETECT_CANVAS_WIDTH;
    canvas.height = Math.round((DETECT_CANVAS_WIDTH * video.videoHeight) / video.videoWidth);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  function trackWarmup(): boolean {
    const now = performance.now();
    if (document.hidden) { warmedUp = false; return true; } // restart the window when the tab returns
    if (!warmedUp) { warmedUp = true; warmupStart = now; warmupCount = 0; return true; }
    warmupCount += 1;
    const elapsed = now - warmupStart;
    if (elapsed < WARMUP_MS) return true;
    if (!meetsMinFps(warmupCount, elapsed)) return false;
    warmupStart = Number.NEGATIVE_INFINITY; // measured once, fine from now on
    return true;
  }

  async function fallbackToCpu(): Promise<boolean> {
    if (delegate === 'CPU') return false;
    try {
      detector?.close();
      detector = await createDetector('CPU');
      delegate = 'CPU';
      return true;
    } catch {
      return false;
    }
  }

  function tick(video: HTMLVideoElement) {
    if (stopped || !detector) return;
    const started = performance.now();
    let result: { detections: unknown[] } | null = null;
    let failed = false;
    if (!document.hidden && video.readyState >= 2) {
      try {
        result = detector.detectForVideo(frameFor(video), started);
      } catch {
        failed = true;
      }
    }
    if (failed) {
      void fallbackToCpu().then((ok) => (ok ? schedule(video, started) : fail('detect-error')));
      return;
    }
    if (result) {
      options.onFaces(result.detections.length);
      if (warmupStart !== Number.NEGATIVE_INFINITY && !trackWarmup()) return fail('low-fps');
    }
    schedule(video, started);
  }

  function schedule(video: HTMLVideoElement, tickStarted: number) {
    if (stopped) return;
    const wait = Math.max(0, intervalMs - (performance.now() - tickStarted));
    timer = setTimeout(() => tick(video), wait);
  }

  return {
    async start(video) {
      try {
        const created = await withTimeout(createDetectorWithFallback(), DETECTOR_INIT_TIMEOUT_MS);
        if (stopped) { created.detector.close(); return false; }
        detector = created.detector;
        delegate = created.delegate;
      } catch {
        fail('init-failed');
        return false;
      }
      tick(video);
      return true;
    },
    stop,
  };
}
