import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentApiError, type StudentApi } from '@/components/quiz/student/api';
import { QuizController, type Deps } from '@/components/quiz/student/controller';
import type { MyQuiz } from '@/components/quiz/student/logic';
import type { ProctorMode } from '@/lib/proctoring/types';

const T0 = Date.parse('2026-10-10T10:00:00Z');
const SKEW = 5 * 60_000; // the server clock is 5 minutes ahead of this device
const iso = (ms: number) => new Date(ms).toISOString();
const serverNow = () => iso(Date.now() + SKEW);
const deadline = (secs: number) => iso(Date.now() + SKEW + secs * 1000);

const myQuiz = (over: Partial<MyQuiz> = {}): MyQuiz => ({
  applicationId: 'a1', projectId: 'p1', projectTitle: 'Shop stock', quizId: 'q1', closesAt: iso(T0 + 3 * 86_400_000), timeLimitSeconds: 600,
  attemptId: null, attemptStatus: null, ...over,
});
const question = (position: number) => ({
  done: false as const, questionId: `k${position}`, position, total: 5, kind: position === 5 ? ('short' as const) : ('mcq' as const),
  prompt: `Question text ${position}`, options: position === 5 ? null : ['A', 'B', 'C', 'D'], deadlineAt: deadline(120), serverNow: serverNow(),
});

function setup(opts: { items?: MyQuiz[]; mode?: ProctorMode; limit?: number } = {}) {
  const calls: string[] = [];
  const api = {
    myQuizzes: vi.fn(async () => opts.items ?? [myQuiz({ timeLimitSeconds: opts.limit ?? 120 })]),
    start: vi.fn(async (..._args: unknown[]) => ({ attemptId: 't1', deadlineAt: deadline(opts.limit ?? 120), serverNow: serverNow() })),
    current: vi.fn(async (..._args: unknown[]): Promise<{ done: true } | ReturnType<typeof question>> => question(1)),
    answer: vi.fn(async (..._args: unknown[]) => ({ ok: true as const, next: 2 as number | null, deadlineAt: deadline(100), serverNow: serverNow() })),
    events: vi.fn(async (..._args: unknown[]) => ({ ok: true as const })),
    submit: vi.fn(async (..._args: unknown[]) => { calls.push('submit'); return { status: 'submitted' as const }; }),
  };
  const deps: Deps = {
    api: api as unknown as StudentApi,
    startCamera: vi.fn(async () => opts.mode ?? 'full'),
    stopCamera: vi.fn(async () => { calls.push('stopCamera'); }),
    now: () => Date.now(),
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
  };
  return { api, deps, calls, ctrl: new QuizController('q1', deps) };
}
type Setup = ReturnType<typeof setup>;

/** Walks a fresh student through intro, consent and the camera check up to a ready "Start quiz" button. */
async function toReady(s: Setup) {
  await s.ctrl.init();
  s.ctrl.begin(false);
  s.ctrl.agree(true);
  await vi.waitFor(() => expect(s.ctrl.getState().camera).toBe('ready'));
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(T0); });
afterEach(() => { vi.useRealTimers(); });

describe('entry', () => {
  it('starts at the intro for a new student and for a resuming one', async () => {
    const fresh = setup(); await fresh.ctrl.init();
    expect(fresh.ctrl.getState()).toMatchObject({ phase: 'intro', resume: false });
    const resume = setup({ items: [myQuiz({ attemptId: 't1', attemptStatus: 'in_progress' })] }); await resume.ctrl.init();
    expect(resume.ctrl.getState()).toMatchObject({ phase: 'intro', resume: true });
  });
  it('shows submitted for a submitted or expired attempt, closed when not listed, unavailable on a network failure', async () => {
    for (const attemptStatus of ['submitted', 'expired'] as const) {
      const s = setup({ items: [myQuiz({ attemptId: 't1', attemptStatus })] }); await s.ctrl.init();
      expect(s.ctrl.getState().phase).toBe('submitted');
    }
    const closed = setup({ items: [] }); await closed.ctrl.init();
    expect(closed.ctrl.getState().phase).toBe('closed');
    const down = setup(); down.api.myQuizzes.mockRejectedValue(new StudentApiError(0)); await down.ctrl.init();
    expect(down.ctrl.getState().phase).toBe('unavailable');
    expect(down.ctrl.getState().error).toContain('could not connect');
  });
});

describe('consent and camera check', () => {
  it('goes through the in-app browser notice only when asked, and lets the student continue', async () => {
    const s = setup(); await s.ctrl.init();
    s.ctrl.begin(true);
    expect(s.ctrl.getState().phase).toBe('blocked-in-app-browser');
    s.ctrl.continueHere();
    expect(s.ctrl.getState().phase).toBe('consent');
  });
  it('does nothing until the box is ticked, then opens the camera check and asks for the camera once', async () => {
    const s = setup(); await s.ctrl.init(); s.ctrl.begin(false);
    s.ctrl.agree(false);
    expect(s.ctrl.getState()).toMatchObject({ phase: 'consent', consentGiven: false });
    expect(s.deps.startCamera).not.toHaveBeenCalled();
    s.ctrl.agree(true);
    expect(s.ctrl.getState()).toMatchObject({ phase: 'camera-check', consentGiven: true });
    await vi.waitFor(() => expect(s.ctrl.getState().camera).toBe('ready'));
    expect(s.deps.startCamera).toHaveBeenCalledTimes(1);
  });
  it('never posts the attempt without consent (not ticked, wrong phase)', async () => {
    const s = setup(); await s.ctrl.init(); s.ctrl.begin(false);
    await s.ctrl.startQuiz();
    expect(s.api.start).not.toHaveBeenCalled();
  });
  it('sends consent:true and the mode the camera check reported', async () => {
    for (const mode of ['full', 'limited'] as const) {
      const s = setup({ mode }); await toReady(s);
      await s.ctrl.startQuiz();
      expect(s.api.start).toHaveBeenCalledWith('q1', { consent: true, proctoringMode: mode });
    }
  });
  it('camera denied: no start until the student chooses, then mode none and the camera is stopped', async () => {
    const s = setup({ mode: 'none' }); await s.ctrl.init(); s.ctrl.begin(false); s.ctrl.agree(true);
    await vi.waitFor(() => expect(s.ctrl.getState().camera).toBe('denied'));
    await s.ctrl.startQuiz(); // plain Start is not offered when denied
    expect(s.api.start).not.toHaveBeenCalled();
    await s.ctrl.startQuiz({ withoutCamera: true });
    expect(s.api.start).toHaveBeenCalledWith('q1', { consent: true, proctoringMode: 'none' });
    expect(s.deps.stopCamera).toHaveBeenCalled();
    expect(s.ctrl.getState().phase).toBe('running');
  });
  it('Try again asks for the camera again', async () => {
    const s = setup({ mode: 'none' }); await s.ctrl.init(); s.ctrl.begin(false); s.ctrl.agree(true);
    await vi.waitFor(() => expect(s.ctrl.getState().camera).toBe('denied'));
    vi.mocked(s.deps.startCamera).mockResolvedValueOnce('full');
    await s.ctrl.runCamera();
    expect(s.ctrl.getState()).toMatchObject({ camera: 'ready', mode: 'full' });
  });
  it('resume skips consent but still re-runs the camera check, then continues from current', async () => {
    const s = setup({ items: [myQuiz({ attemptId: 't1', attemptStatus: 'in_progress' })] });
    await s.ctrl.init(); s.ctrl.begin(false);
    expect(s.ctrl.getState().phase).toBe('camera-check');
    await vi.waitFor(() => expect(s.ctrl.getState().camera).toBe('ready'));
    expect(s.deps.startCamera).toHaveBeenCalledTimes(1);
    await s.ctrl.startQuiz();
    expect(s.api.start).toHaveBeenCalledWith('q1', { consent: true, proctoringMode: 'full' });
    expect(s.api.current).toHaveBeenCalledWith('t1');
    expect(s.ctrl.getState().phase).toBe('running');
  });
  it('a 409 on start re-reads the list: already taken shows submitted, closed shows closed', async () => {
    const s = setup(); await toReady(s);
    s.api.start.mockRejectedValue(new StudentApiError(409, 'You have already taken this quiz.'));
    s.api.myQuizzes.mockResolvedValue([myQuiz({ attemptId: 't1', attemptStatus: 'submitted' })]);
    await s.ctrl.startQuiz();
    expect(s.ctrl.getState().phase).toBe('submitted');
    const c = setup(); await toReady(c);
    c.api.start.mockRejectedValue(new StudentApiError(409, 'This quiz is closed.'));
    c.api.myQuizzes.mockResolvedValue([]);
    await c.ctrl.startQuiz();
    expect(c.ctrl.getState().phase).toBe('closed');
  });
});

describe('running', () => {
  it('shows one question at a time and uses the server clock for the deadline', async () => {
    const s = setup(); await toReady(s); await s.ctrl.startQuiz();
    const st = s.ctrl.getState();
    expect(st.phase).toBe('running');
    expect(st.question).toMatchObject({ position: 1, total: 5, prompt: 'Question text 1' });
    expect(st.offsetMs).toBe(SKEW);
    expect(st.deadlineMs! - st.offsetMs - Date.now()).toBe(120_000); // 120s left on the device clock too
    s.api.current.mockResolvedValueOnce(question(2));
    await s.ctrl.answer({ answerIndex: 1 });
    expect(s.api.answer).toHaveBeenCalledWith('t1', { questionId: 'k1', answerIndex: 1 });
    expect(s.ctrl.getState().question).toMatchObject({ position: 2, prompt: 'Question text 2' });
  });
  it('submits after the last answer, stopping the camera first', async () => {
    const s = setup(); await toReady(s); await s.ctrl.startQuiz();
    s.api.answer.mockResolvedValueOnce({ ok: true, next: null, deadlineAt: deadline(10), serverNow: serverNow() });
    await s.ctrl.answer({ answerText: 'Count the stock weekly.' });
    expect(s.calls).toEqual(['stopCamera', 'submit']);
    expect(s.ctrl.getState().phase).toBe('submitted');
  });
  it('a network error keeps the question and lets the student retry; a 409 re-fetches the current question', async () => {
    const s = setup(); await toReady(s); await s.ctrl.startQuiz();
    s.api.answer.mockRejectedValueOnce(new StudentApiError(0));
    await s.ctrl.answer({ answerIndex: 2 });
    expect(s.ctrl.getState()).toMatchObject({ busy: null, phase: 'running' });
    expect(s.ctrl.getState().error).toContain('still here');
    expect(s.ctrl.getState().question?.position).toBe(1);
    s.api.answer.mockRejectedValueOnce(new StudentApiError(409, 'That is not the current question.'));
    s.api.current.mockResolvedValueOnce(question(3));
    await s.ctrl.answer({ answerIndex: 2 });
    expect(s.ctrl.getState().error).toBe('');
    expect(s.ctrl.getState().question?.position).toBe(3);
  });
  it('a 409 after the deadline ends in the submitted screen (current says done)', async () => {
    const s = setup(); await toReady(s); await s.ctrl.startQuiz();
    s.api.answer.mockRejectedValueOnce(new StudentApiError(409, 'This attempt has ended.'));
    s.api.current.mockResolvedValueOnce({ done: true });
    await s.ctrl.answer({ answerIndex: 0 });
    expect(s.ctrl.getState().phase).toBe('submitted');
    expect(s.api.submit).toHaveBeenCalledTimes(1);
  });
  it('auto-submits once when the countdown reaches zero, even if the student also submits', async () => {
    const s = setup({ limit: 3 }); await toReady(s); await s.ctrl.startQuiz();
    expect(s.api.submit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2_900);
    expect(s.api.submit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    void s.ctrl.finish(); void s.ctrl.finish();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(s.api.submit).toHaveBeenCalledTimes(1);
    expect(s.calls).toEqual(['stopCamera', 'submit']);
    expect(s.ctrl.getState().phase).toBe('submitted');
  });
  it('a failed submit can be retried', async () => {
    const s = setup(); await toReady(s); await s.ctrl.startQuiz();
    s.api.submit.mockRejectedValueOnce(new StudentApiError(0));
    await s.ctrl.finish();
    expect(s.ctrl.getState()).toMatchObject({ phase: 'running', busy: null });
    await s.ctrl.finish();
    expect(s.ctrl.getState().phase).toBe('submitted');
  });
});

describe('proctoring events', () => {
  it('drops events before the attempt exists, then posts them with atMs measured from the attempt start', async () => {
    const s = setup(); await s.ctrl.init(); s.ctrl.begin(false); s.ctrl.agree(true);
    await vi.waitFor(() => expect(s.ctrl.getState().camera).toBe('ready'));
    await s.ctrl.handleEvents([{ kind: 'no_face', atMs: 500 }]);
    expect(s.api.events).not.toHaveBeenCalled();
    vi.advanceTimersByTime(8_000); // 8s of camera check before Start quiz
    await s.ctrl.startQuiz();
    await s.ctrl.handleEvents([{ kind: 'tab_hidden', atMs: 10_000, durationMs: 3_000 }, { kind: 'no_face', atMs: 2_000 }]);
    // vi.waitFor also advances the fake clock a little, so allow that slack around the 2s expected.
    const sent = s.api.events.mock.calls[0] as [string, Array<{ kind: string; atMs: number; durationMs?: number }>];
    expect(sent[0]).toBe('t1');
    expect(sent[1]).toHaveLength(1); // the pre-quiz no_face is dropped
    expect(sent[1][0]).toMatchObject({ kind: 'tab_hidden', durationMs: 3_000 });
    expect(sent[1][0].atMs).toBeGreaterThan(1_500);
    expect(sent[1][0].atMs).toBeLessThanOrEqual(2_000);
  });
  it('swallows refusals but throws on network or server trouble so the batcher retries', async () => {
    const s = setup(); await toReady(s); await s.ctrl.startQuiz();
    const batch = [{ kind: 'tab_hidden' as const, atMs: 99_999 }];
    s.api.events.mockRejectedValueOnce(new StudentApiError(409, 'This attempt has ended.'));
    await expect(s.ctrl.handleEvents(batch)).resolves.toBeUndefined();
    s.api.events.mockRejectedValueOnce(new StudentApiError(0));
    await expect(s.ctrl.handleEvents(batch)).rejects.toBeInstanceOf(StudentApiError);
    s.api.events.mockRejectedValueOnce(new StudentApiError(503));
    await expect(s.ctrl.handleEvents(batch)).rejects.toBeInstanceOf(StudentApiError);
  });
});
