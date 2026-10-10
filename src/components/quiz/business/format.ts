import { INTEGRITY_EVENT_KINDS } from '@/lib/quiz/constants';
import type { AttemptStatus, Integrity, ProctoringMode, ResultItem } from './types';

// Plain-words helpers for the results list. Everything here describes signals; none of it decides anything.

export const STATUS_LABEL: Record<AttemptStatus, string> = {
  not_taken: 'Not taken', in_progress: 'In progress', submitted: 'Submitted', expired: 'Expired',
};
export const statusLabel = (s: AttemptStatus): string => STATUS_LABEL[s] ?? 'Not taken';

export const MODE_LABEL: Record<ProctoringMode, string> = { full: 'Full', limited: 'Limited', none: 'None' };
export const MODE_HELP: Record<ProctoringMode, string> = {
  full: 'Camera and tab checks ran.',
  limited: 'Camera checks could not run, so only tab and app switches were noted.',
  none: 'No checks ran for this attempt.',
};
export const modeLabel = (m: ProctoringMode | null): string => (m ? MODE_LABEL[m] : '-');

/** Labels for the flags shown to the business. Technical notes (proctoring_unavailable) are not counted as flags. */
const FLAG_LABEL: Record<string, string> = {
  no_face: 'no face seen',
  multiple_faces: 'more than one face',
  tab_hidden: 'tab hidden',
  app_background: 'app in background',
  fullscreen_exit: 'left full screen',
  camera_lost: 'camera lost',
  copy_paste: 'copy or paste',
};
const NOTE_KINDS = ['proctoring_unavailable'];

const safeCount = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

export function durationLabel(totalSeconds: number | null): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return '-';
  const s = Math.round(totalSeconds);
  const m = Math.floor(s / 60);
  return m === 0 ? `${s}s` : `${m}m ${String(s % 60).padStart(2, '0')}s`;
}

/** "2 flags: tab hidden x1, no face seen x1, 14s away". Advisory wording only. */
export function integritySummary(integrity: Integrity | null | undefined, mode: ProctoringMode | null): string {
  if (mode === 'none') return 'No checks ran';
  const counts = integrity?.counts ?? {};
  const known = INTEGRITY_EVENT_KINDS.filter((k) => !NOTE_KINDS.includes(k));
  const extra = Object.keys(counts).filter((k) => !(INTEGRITY_EVENT_KINDS as readonly string[]).includes(k));
  const parts = [...known, ...extra]
    .map((k) => ({ label: FLAG_LABEL[k] ?? k.replace(/_/g, ' '), n: safeCount(counts[k]) }))
    .filter((p) => p.n > 0);
  const total = parts.reduce((sum, p) => sum + p.n, 0);
  const away = safeCount(integrity?.totalAwayMs) / 1000;
  const noteText = safeCount(counts.proctoring_unavailable) > 0 ? 'camera check unavailable' : '';
  if (total === 0 && !noteText) return 'No flags';
  const bits = parts.map((p) => `${p.label} ×${p.n}`);
  if (away >= 1) bits.push(`${durationLabel(away)} away`);
  if (noteText) bits.push(noteText);
  if (total === 0) return bits.join(', ');
  return `${total} ${total === 1 ? 'flag' : 'flags'}: ${bits.join(', ')}`;
}

export function scoreLabel(score: number | null, max: number | null): string {
  return score == null || max == null ? '-' : `${score}/${max}`;
}
export function shortScoreLabel(item: Pick<ResultItem, 'status' | 'shortScore' | 'shortMax'>): string {
  if (item.shortScore != null) return scoreLabel(item.shortScore, item.shortMax ?? 4);
  return item.status === 'submitted' || item.status === 'expired' ? 'Not graded' : '-';
}

export const totalScore = (i: Pick<ResultItem, 'mcqScore' | 'shortScore'>): number => (i.mcqScore ?? 0) + (i.shortScore ?? 0);

export type ResultFilter = 'all' | 'taken' | 'not_taken';
export type ResultSort = 'default' | 'score';

/** Filter and sort for convenience only. Nothing here ranks or ejects anybody; people without a score stay listed. */
export function arrangeResults(items: ResultItem[], filter: ResultFilter, sort: ResultSort): ResultItem[] {
  const kept = items.filter((i) => filter === 'all' || (filter === 'not_taken') === (i.status === 'not_taken'));
  if (sort === 'default') return kept;
  const scored = (i: ResultItem) => (i.status === 'submitted' || i.status === 'expired' ? 1 : 0);
  return [...kept].sort((a, b) => scored(b) - scored(a) || totalScore(b) - totalScore(a));
}

export const closesLabel = (iso: string | null): string => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
};

export const GENERATION_STEPS = ['Reading your problem…', 'Writing 5 questions…', 'Checking the answers…', 'Almost there…'];
const STEP_MS = 4000;
export const generationStep = (elapsedMs: number): string =>
  GENERATION_STEPS[Math.min(GENERATION_STEPS.length - 1, Math.max(0, Math.floor(elapsedMs / STEP_MS)))];
