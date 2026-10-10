/** Shared proctoring types. Mirrors the quiz_integrity_events kinds (migrations/007_ai_quiz.sql). */
export const PROCTOR_EVENT_KINDS = [
  'no_face',
  'multiple_faces',
  'tab_hidden',
  'app_background',
  'fullscreen_exit',
  'camera_lost',
  'proctoring_unavailable',
  'copy_paste',
] as const;

export type ProctorEventKind = (typeof PROCTOR_EVENT_KINDS)[number];

/** atMs is milliseconds since the attempt started. Only kind and timing are ever sent, never frames. */
export interface ProctorEvent {
  kind: ProctorEventKind;
  atMs: number;
  durationMs?: number;
}

/** full = camera + face detection, limited = visibility signals only, none = no camera permission. */
export type ProctorMode = 'full' | 'limited' | 'none';

export interface ProctorProfile {
  isMobile: boolean;
  noFaceGraceMs: number;
  hiddenGraceMs: number;
  fps: number;
  requireFullscreen: boolean;
}

export interface Environment {
  isMobile: boolean;
  /** Name of the in-app browser (Instagram, Facebook, ...) or null when a normal browser. */
  inAppBrowser: string | null;
  canCamera: boolean;
  canFullscreen: boolean;
  canWakeLock: boolean;
  profile: ProctorProfile;
}

export interface ProctorSummary {
  counts: Partial<Record<ProctorEventKind, number>>;
  /** Total time the page was hidden or backgrounded (flagged episodes only). */
  totalAwayMs: number;
  /** Events discarded because of the per-kind or per-attempt caps. */
  dropped: number;
}

export type MaybePromise<T> = T | Promise<T>;
