export const QUIZ_QUESTION_COUNT = 5;
export const QUIZ_MCQ_COUNT = 4;
export const QUIZ_SHORT_COUNT = 1;
/** A project becomes quiz-eligible when it has MORE than this many non-withdrawn applicants. */
export const QUIZ_MIN_APPLICANTS = 3;
export const DEFAULT_TIME_LIMIT_SECONDS = 600;
export const MIN_TIME_LIMIT_SECONDS = 300;
export const MAX_TIME_LIMIT_SECONDS = 1800;
export const QUIZ_OPEN_WINDOW_HOURS = 72;
export const MCQ_OPTION_COUNT = 4;
export const SHORT_MAX_POINTS = 4;
export const MAX_ANSWER_CHARS = 2000;
export const MAX_EVENTS_PER_ATTEMPT = 200;
export const MAX_EVENTS_PER_BATCH = 20;
export const DEFAULT_QUIZ_MODEL = 'gemini-3.5-flash';
export const QUIZ_GENERATION_TIMEOUT_MS = 30_000;
export const GENERATE_RATE_LIMIT = 5; // per 10 minutes (the limiter window)

export const INTEGRITY_EVENT_KINDS = [
  'no_face', 'multiple_faces', 'tab_hidden', 'app_background', 'fullscreen_exit', 'camera_lost', 'proctoring_unavailable', 'copy_paste',
] as const;
export type IntegrityEventKind = (typeof INTEGRITY_EVENT_KINDS)[number];
