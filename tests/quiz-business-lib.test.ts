import { afterEach, describe, expect, it, vi } from 'vitest';
import { questionsSchema } from '@/lib/quiz/schema';
import { quizApi, quizRequest } from '@/components/quiz/business/api';
import {
  arrangeResults, durationLabel, generationStep, integritySummary, scoreLabel, shortScoreLabel, statusLabel,
} from '@/components/quiz/business/format';
import type { DraftQuestion, ResultItem } from '@/components/quiz/business/types';
import { draftsFromQuiz, questionProblems, timeLimitChoices, toPayload, validateDrafts } from '@/components/quiz/business/validate';

const mcq = (n: number): DraftQuestion => ({ kind: 'mcq', prompt: `Which step should the shop take first (${n})?`, options: [`A${n}`, `B${n}`, `C${n}`, `D${n}`], correctIndex: 1, rubric: '' });
const short: DraftQuestion = { kind: 'short', prompt: 'Describe how you would approach the stock problem.', options: ['', '', '', ''], correctIndex: 0, rubric: 'Mentions counting stock and a simple tracking sheet.' };
const valid = (): DraftQuestion[] => [mcq(1), mcq(2), mcq(3), mcq(4), short];
const item = (over: Partial<ResultItem>): ResultItem => ({
  applicationId: 'a', studentId: 's', displayName: 'Asha', status: 'submitted', mcqScore: 3, mcqMax: 4, shortScore: 2, shortMax: 4,
  shortAnswer: 'x', shortFeedback: 'y', timeTakenSeconds: 372, proctoringMode: 'full', integrity: { counts: {}, totalAwayMs: 0 }, ...over,
});

describe('validateDrafts (mirrors src/lib/quiz/schema.ts)', () => {
  it('accepts 4 multiple choice + 1 short and agrees with the server schema', () => {
    expect(validateDrafts(valid()).ok).toBe(true);
    expect(questionsSchema.safeParse(toPayload(valid())).success).toBe(true);
  });
  it('requires exactly five questions with a 4 + 1 mix', () => {
    expect(validateDrafts(valid().slice(0, 4)).quizProblem).toMatch(/exactly 4 multiple choice/);
    expect(validateDrafts([mcq(1), mcq(2), mcq(3), mcq(4), mcq(5)]).ok).toBe(false);
    expect(questionsSchema.safeParse(toPayload([mcq(1), mcq(2), mcq(3), mcq(4), mcq(5)])).success).toBe(false);
  });
  it('flags short prompts, empty and duplicate options, a bad correct index and a thin marking guide', () => {
    expect(questionProblems({ ...mcq(1), prompt: 'too short' })[0]).toMatch(/at least 10/);
    expect(questionProblems({ ...mcq(1), options: ['A', '', 'C', 'D'] })).toContain('Fill in all 4 options.');
    expect(questionProblems({ ...mcq(1), options: ['Same', 'same ', 'C', 'D'] })).toContain('Options must be different from each other.');
    expect(questionProblems({ ...mcq(1), correctIndex: 4 })).toContain('Choose which option is correct.');
    expect(questionProblems({ ...short, rubric: 'brief' })[0]).toMatch(/marking guide needs at least 10/);
    expect(questionProblems({ ...mcq(1), prompt: 'x'.repeat(601) })[0]).toMatch(/at most 600/);
  });
  it('trims values in the payload and builds editable drafts from a stored quiz', () => {
    const p = toPayload([{ ...mcq(1), prompt: '  Which step should the shop take first?  ' }]);
    expect(p[0]).toMatchObject({ prompt: 'Which step should the shop take first?' });
    const drafts = draftsFromQuiz({
      id: 'q', status: 'draft', timeLimitSeconds: 600, openedAt: null, closesAt: null,
      questions: [{ id: '2', position: 2, kind: 'short', prompt: 'p', options: null, correctIndex: null, rubric: 'r' }, { id: '1', position: 1, kind: 'mcq', prompt: 'q', options: ['a', 'b', 'c', 'd'], correctIndex: 2, rubric: null }],
    });
    expect(drafts.map((d) => d.kind)).toEqual(['mcq', 'short']);
    expect(drafts[1].options).toHaveLength(4);
  });
  it('offers 5 to 30 minutes in steps of 5', () => {
    expect(timeLimitChoices()).toEqual([300, 600, 900, 1200, 1500, 1800]);
  });
});

describe('integritySummary', () => {
  it('writes flags in plain words with the time away', () => {
    expect(integritySummary({ counts: { tab_hidden: 1, no_face: 1 }, totalAwayMs: 14_000 }, 'full')).toBe('2 flags: no face seen ×1, tab hidden ×1, 14s away');
  });
  it('uses the singular and handles no flags, limited mode and no checks', () => {
    expect(integritySummary({ counts: { copy_paste: 1 }, totalAwayMs: 0 }, 'limited')).toBe('1 flag: copy or paste ×1');
    expect(integritySummary({ counts: {}, totalAwayMs: 0 }, 'full')).toBe('No flags');
    expect(integritySummary({ counts: { no_face: 3 }, totalAwayMs: 0 }, 'none')).toBe('No checks ran');
  });
  it('does not count a technical note as a flag', () => {
    expect(integritySummary({ counts: { proctoring_unavailable: 1 }, totalAwayMs: 0 }, 'limited')).toBe('camera check unavailable');
    expect(integritySummary({ counts: { proctoring_unavailable: 1, tab_hidden: 2 }, totalAwayMs: 65_000 }, 'limited')).toBe('2 flags: tab hidden ×2, 1m 05s away, camera check unavailable');
  });
  it('survives odd data', () => {
    expect(integritySummary(null, 'full')).toBe('No flags');
    expect(integritySummary({ counts: { no_face: -2, tab_hidden: Number.NaN, brand_new_kind: 2 }, totalAwayMs: Number.NaN }, 'full')).toBe('2 flags: brand new kind ×2');
  });
  it('never uses accusing words', () => {
    const text = [integritySummary({ counts: { no_face: 1, multiple_faces: 1, tab_hidden: 1, app_background: 1, fullscreen_exit: 1, camera_lost: 1, copy_paste: 1 }, totalAwayMs: 90_000 }, 'full')].join(' ');
    expect(text).not.toMatch(/reject|cheat|fraud|suspicious/i);
  });
});

describe('labels and ordering', () => {
  it('labels scores, statuses and durations', () => {
    expect(scoreLabel(3, 4)).toBe('3/4');
    expect(scoreLabel(null, 4)).toBe('-');
    expect(statusLabel('not_taken')).toBe('Not taken');
    expect(statusLabel('in_progress')).toBe('In progress');
    expect(shortScoreLabel(item({ shortScore: null }))).toBe('Not graded');
    expect(shortScoreLabel(item({ status: 'in_progress', shortScore: null }))).toBe('-');
    expect(shortScoreLabel(item({ shortScore: 4 }))).toBe('4/4');
    expect(durationLabel(372)).toBe('6m 12s');
    expect(durationLabel(45)).toBe('45s');
    expect(durationLabel(null)).toBe('-');
  });
  it('filters and sorts for convenience while keeping everyone listed', () => {
    const items = [item({ applicationId: '1', mcqScore: 1, shortScore: 0 }), item({ applicationId: '2', status: 'not_taken', mcqScore: null, shortScore: null }), item({ applicationId: '3', mcqScore: 4, shortScore: 4 })];
    expect(arrangeResults(items, 'all', 'default').map((i) => i.applicationId)).toEqual(['1', '2', '3']);
    expect(arrangeResults(items, 'all', 'score').map((i) => i.applicationId)).toEqual(['3', '1', '2']);
    expect(arrangeResults(items, 'not_taken', 'default').map((i) => i.applicationId)).toEqual(['2']);
    expect(arrangeResults(items, 'taken', 'default').map((i) => i.applicationId)).toEqual(['1', '3']);
  });
  it('steps the generation message over time', () => {
    expect(generationStep(0)).toBe('Reading your problem…');
    expect(generationStep(5000)).toBe('Writing 5 questions…');
    expect(generationStep(999_000)).toBe('Almost there…');
  });
});

describe('quiz api client', () => {
  afterEach(() => vi.unstubAllGlobals());
  const reply = (status: number, body: unknown) => vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });

  it('uses the server message for 409 and friendly text for 429 and 502', async () => {
    vi.stubGlobal('fetch', reply(409, { error: 'A quiz needs more than 3 applicants.' }));
    await expect(quizRequest('/x', 'POST')).rejects.toMatchObject({ message: 'A quiz needs more than 3 applicants.', status: 409 });
    vi.stubGlobal('fetch', reply(429, { error: 'Too many attempts. Try again later.' }));
    await expect(quizRequest('/x', 'POST')).rejects.toMatchObject({ status: 429, message: expect.stringContaining('wait a few minutes') });
    vi.stubGlobal('fetch', reply(502, { error: 'We could not generate the quiz. Please try again.' }));
    await expect(quizRequest('/x', 'POST')).rejects.toMatchObject({ status: 502, message: expect.stringContaining('could not write the quiz') });
  });
  it('reports a network failure in plain words', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(quizRequest('/x')).rejects.toMatchObject({ message: expect.stringContaining('connect') });
  });
  it('sends same-origin JSON writes to the right routes', async () => {
    const f = reply(200, { quiz: { id: 'q' } });
    vi.stubGlobal('fetch', f);
    await quizApi('p1').save({ timeLimitSeconds: 900 });
    await quizApi('p1').open();
    expect(f.mock.calls[0][0]).toBe('/api/business/projects/p1/quiz');
    expect(f.mock.calls[0][1]).toMatchObject({ method: 'PATCH', credentials: 'same-origin', body: '{"timeLimitSeconds":900}' });
    expect(f.mock.calls[1][0]).toBe('/api/business/projects/p1/quiz/open');
  });
});
