import type { ProctorEvent, ProctorMode } from '@/lib/proctoring/types';

/** Pure helpers for the student quiz flow: clock math, formatting, entry/resume decisions and error mapping. */

export type AttemptStatus = 'in_progress' | 'submitted' | 'expired';
export interface MyQuiz {
  applicationId: string; projectId: string; projectTitle: string; quizId: string; closesAt: string; timeLimitSeconds: number;
  attemptId: string | null; attemptStatus: AttemptStatus | null;
}

export type Phase = 'loading' | 'unavailable' | 'closed' | 'intro' | 'blocked-in-app-browser' | 'consent' | 'camera-check' | 'running' | 'submitted';

export const AMBER_UNDER_MS = 60_000;

// ---- clock ----
/** serverNow - clientNow. Add it to a client clock reading to get server time. */
export const clockOffset = (serverNowIso: string, clientNowMs: number): number => new Date(serverNowIso).getTime() - clientNowMs;

/** Milliseconds left on the SERVER clock, never negative. A skewed device clock does not change the result. */
export const remainingMs = (deadlineMs: number, offsetMs: number, clientNowMs: number): number =>
  Math.max(0, deadlineMs - (clientNowMs + offsetMs));

/** mm:ss, rounded up so the display only shows 00:00 when time is really up. */
export function formatTimer(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const mm = Math.floor(total / 60), ss = total % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export const timerTone = (ms: number): 'normal' | 'amber' => (ms < AMBER_UNDER_MS ? 'amber' : 'normal');

export const minutesLabel = (seconds: number): string => {
  const m = Math.max(1, Math.round(seconds / 60));
  return `${m} minute${m === 1 ? '' : 's'}`;
};

// ---- entry / resume ----
export type Entry =
  | { kind: 'closed' }
  | { kind: 'submitted'; quiz: MyQuiz }
  | { kind: 'resume'; quiz: MyQuiz }
  | { kind: 'fresh'; quiz: MyQuiz };

/** Decides where the page starts, from the student's own quiz list. Not listed means closed, withdrawn or not theirs. */
export function resolveEntry(items: readonly MyQuiz[], quizId: string): Entry {
  const quiz = items.find((i) => i.quizId === quizId);
  if (!quiz) return { kind: 'closed' };
  if (quiz.attemptStatus === 'submitted' || quiz.attemptStatus === 'expired') return { kind: 'submitted', quiz };
  return quiz.attemptStatus === 'in_progress' ? { kind: 'resume', quiz } : { kind: 'fresh', quiz };
}

export type InviteState = 'start' | 'resume' | 'submitted';
export const inviteState = (i: Pick<MyQuiz, 'attemptStatus'>): InviteState =>
  i.attemptStatus === 'in_progress' ? 'resume' : i.attemptStatus ? 'submitted' : 'start';

// ---- proctoring ----
/** What we tell the server. The student's explicit "continue without camera" always wins over whatever the camera reported. */
export const chooseMode = (reported: ProctorMode | null, withoutCamera: boolean): ProctorMode =>
  withoutCamera || !reported ? 'none' : reported;

export type FaceStatus = 'looking' | 'one' | 'none' | 'many' | 'limited';
export function faceStatus(mode: ProctorMode, facesNow: number | null): FaceStatus {
  if (mode !== 'full') return 'limited';
  if (facesNow === null) return 'looking';
  return facesNow === 0 ? 'none' : facesNow === 1 ? 'one' : 'many';
}

export const STATUS_DOT: Record<ProctorMode, string> = { full: 'Camera checks on', limited: 'Limited checks', none: 'Camera off' };

/**
 * Proctoring starts (and counts atMs) at the camera check, before the attempt exists. Shift each event so atMs is measured from the
 * attempt start, and drop anything that happened before it (setting up the phone is not part of the quiz).
 */
export function shiftEvents(batch: readonly ProctorEvent[], originGapMs: number): ProctorEvent[] {
  return batch
    .map((e) => ({ ...e, atMs: Math.round(e.atMs + originGapMs) }))
    .filter((e) => e.atMs >= 0);
}

// ---- answers ----
export const ANSWER_MAX_CHARS = 2000;
export const isAnswered = (kind: 'mcq' | 'short', selected: number | null, text: string): boolean =>
  kind === 'mcq' ? selected !== null : text.trim().length > 0 && text.length <= ANSWER_MAX_CHARS;

// ---- errors ----
export type ErrorKind = 'network' | 'auth' | 'conflict' | 'rate' | 'server' | 'other';
export interface FriendlyError { kind: ErrorKind; message: string }

export function mapError(status: number, serverMessage = ''): FriendlyError {
  if (status === 0) return { kind: 'network', message: 'We could not connect. Check your connection and try again. Your answer is still here.' };
  if (status === 401) return { kind: 'auth', message: 'Please sign in again to continue.' };
  if (status === 409) return { kind: 'conflict', message: serverMessage || 'This quiz moved on. Reloading your place.' };
  if (status === 429) return { kind: 'rate', message: 'Too many tries. Wait a minute and try again.' };
  if (status >= 500) return { kind: 'server', message: 'Something went wrong on our side. Try again in a moment. Your answer is still here.' };
  return { kind: 'other', message: serverMessage || 'We could not do that. Please try again.' };
}
