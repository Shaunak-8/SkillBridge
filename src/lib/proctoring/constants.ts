import type { ProctorProfile } from './types';

// Kept in sync with src/lib/quiz/constants.ts (MAX_EVENTS_PER_ATTEMPT / MAX_EVENTS_PER_BATCH).
export const MAX_EVENTS_PER_ATTEMPT = 200;
export const MAX_EVENTS_PER_BATCH = 20;
export const BATCH_INTERVAL_MS = 5000;

/** Per-kind cap so one noisy signal cannot use up the whole attempt budget. */
export const MAX_EVENTS_PER_KIND = 60;

/** A face briefly seen (or lost) inside a longer episode does not split it. */
export const MERGE_GAP_MS = 1000;
/** Copy/paste bursts closer than this count as one event. */
export const COPY_PASTE_DEBOUNCE_MS = 1000;

export const DESKTOP_PROFILE: ProctorProfile = {
  isMobile: false,
  noFaceGraceMs: 3000,
  hiddenGraceMs: 2000,
  fps: 5,
  requireFullscreen: false, // enabled by capability detection
};

export const MOBILE_PROFILE: ProctorProfile = {
  isMobile: true,
  noFaceGraceMs: 5000,
  hiddenGraceMs: 2000,
  fps: 2.5,
  requireFullscreen: false,
};

/** Coarse pointer or a viewport narrower than this is treated as a phone. */
export const MOBILE_MAX_VIEWPORT_WIDTH = 600;

// Detector tuning
export const MIN_ACCEPTABLE_FPS = 1;
export const WARMUP_MS = 5000;
export const DETECTOR_INIT_TIMEOUT_MS = 20000;
export const DETECT_CANVAS_WIDTH = 256;

export const MEDIAPIPE_WASM_PATH = '/mediapipe/wasm';
export const MEDIAPIPE_MODEL_PATH = '/mediapipe/blaze_face_short_range.tflite';

export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
  audio: false,
};
