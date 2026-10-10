import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const sql = vi.hoisted(() => Object.assign(vi.fn(), { transaction: vi.fn() }));
const current = vi.hoisted(() => vi.fn());
const origin = vi.hoisted(() => vi.fn());
const limiter = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ database: () => sql }));
vi.mock('@/lib/auth/profile', () => ({ currentProfile: current }));
vi.mock('@/lib/auth/security', () => ({ sameOrigin: origin, rateLimit: limiter }));
import { GET as getQuiz, POST as generate, PATCH as patchQuiz } from '@/app/api/business/projects/[id]/quiz/route';
import { POST as openQuiz } from '@/app/api/business/projects/[id]/quiz/open/route';
import { POST as closeQuiz } from '@/app/api/business/projects/[id]/quiz/close/route';
import { GET as results } from '@/app/api/business/projects/[id]/quiz/results/route';

const PID = '11111111-1111-4111-8111-111111111111';
const BIZ = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const STU = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const as = (role: string, id: string) => current.mockResolvedValue({ user: { id: 'u', emailVerified: true }, profile: { id, role, onboarding_completed: true } });
const req = (body?: unknown, method = 'POST') => new Request('http://x/api', { method, body: body === undefined ? undefined : JSON.stringify(body) });

const mcq = (n: number) => ({ kind: 'mcq', prompt: `Scenario question number ${n} for the shop?`, options: [`A${n} one`, `B${n} two`, `C${n} three`, `D${n} four`], correctIndex: 2 });
const short = { kind: 'short', prompt: 'Describe how you would handle a rush at the counter.', rubric: 'Names a concrete feature and links it to staff workflow.' };
const five = () => [mcq(1), mcq(2), mcq(3), mcq(4), short];
const stored = (qs: ReturnType<typeof five>) => qs.map((q, i) => ({
  id: `q${i}`, position: i + 1, kind: q.kind, prompt: q.prompt,
  options: 'options' in q ? q.options : null, correctIndex: 'correctIndex' in q ? q.correctIndex : null, rubric: 'rubric' in q ? q.rubric : null,
}));

/** Fake database driven by SQL text. `db` is mutated per test. */
const db = {
  project: null as Record<string, unknown> | null, count: 4, quiz: null as Record<string, unknown> | null,
  draftEditable: true, openOk: true, closeOk: true, resultRows: [] as Record<string, unknown>[],
};
const projectRow = (o = {}) => ({ id: PID, owner_profile_id: BIZ, status: 'published', title: 'Snack shop', summary: 'Track orders', problem_statement: 'Orders get lost.', category: 'Web', required_skills: ['React'], deliverables: ['Dashboard'], ...o });
const quizRow = (status: string, questions: unknown = stored(five())) => ({ id: 'quiz1', status, time_limit_seconds: 600, opened_at: null, closes_at: null, questions });
const text = (strings: TemplateStringsArray) => strings.join('?');

function fakeSql(strings: TemplateStringsArray) {
  const q = text(strings);
  if (q.includes('FROM skillbridge.projects WHERE id')) return Promise.resolve(db.project ? [db.project] : []);
  if (q.includes('count(*)::int AS n')) return Promise.resolve([{ n: db.count }]);
  if (q.includes('FROM skillbridge.project_quizzes q WHERE q.project_id')) return Promise.resolve(db.quiz ? [db.quiz] : []);
  if (q.includes("SET status = 'open'")) return Promise.resolve(db.openOk ? [{ id: 'quiz1' }] : []);
  if (q.includes("SET status = 'closed'")) return Promise.resolve(db.closeOk ? [{ id: 'quiz1' }] : []);
  if (q.includes('SET time_limit_seconds')) return Promise.resolve(db.draftEditable ? [{ id: 'quiz1' }] : []);
  if (q.includes('INSERT INTO skillbridge.project_quizzes')) return Promise.resolve(db.draftEditable ? [{ id: 'quiz1' }] : []);
  if (q.includes('DELETE FROM skillbridge.quiz_questions')) return Promise.resolve([]);
  if (q.includes('INSERT INTO skillbridge.quiz_questions')) return Promise.resolve(db.draftEditable ? [1, 2, 3, 4, 5].map((id) => ({ id })) : []);
  if (q.includes('FROM skillbridge.applications a')) return Promise.resolve(db.resultRows);
  return Promise.reject(new Error(`unexpected sql: ${q.slice(0, 60)}`));
}

const geminiOk = (questions: unknown) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ questions }) }] } }] }) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', fetchMock);
  process.env.GEMINI_QUIZ_API_KEY = 'quiz-key';
  Object.assign(db, { project: projectRow(), count: 4, quiz: null, draftEditable: true, openOk: true, closeOk: true, resultRows: [] });
  sql.mockImplementation(fakeSql as never);
  sql.transaction.mockImplementation(async (queries: Promise<unknown>[]) => Promise.all(queries));
  origin.mockReturnValue(true);
  limiter.mockResolvedValue(true);
  as('business', BIZ);
});

describe('access matrix', () => {
  const calls: Array<[string, (c: ReturnType<typeof ctx>) => Promise<Response>]> = [
    ['GET quiz', (c) => getQuiz(req(undefined, 'GET'), c)],
    ['POST generate', (c) => generate(req(), c)],
    ['PATCH quiz', (c) => patchQuiz(req({ timeLimitSeconds: 600 }, 'PATCH'), c)],
    ['POST open', (c) => openQuiz(req(), c)],
    ['POST close', (c) => closeQuiz(req(), c)],
    ['GET results', (c) => results(req(undefined, 'GET'), c)],
  ];
  it.each(calls)('%s: anonymous gets 401', async (_n, call) => {
    current.mockResolvedValue(null);
    expect((await call(ctx(PID))).status).toBe(401);
  });
  it.each(calls)('%s: a student gets 403 and sees no answers', async (_n, call) => {
    as('student', STU);
    const res = await call(ctx(PID));
    expect(res.status).toBe(403);
    expect(await res.text()).not.toContain('correctIndex');
  });
  it.each(calls)('%s: a non-owner business gets 403 and sees no answers', async (_n, call) => {
    db.quiz = quizRow('open');
    as('business', OTHER);
    const res = await call(ctx(PID));
    expect(res.status).toBe(403);
    expect(await res.text()).not.toMatch(/correctIndex|rubric/);
  });
  it.each(calls)('%s: unknown project is 404', async (_n, call) => {
    db.project = null;
    expect((await call(ctx(PID))).status).toBe(404);
  });
  it.each(calls)('%s: malformed id is 404', async (_n, call) => {
    expect((await call(ctx('nope'))).status).toBe(404);
  });
  it.each(calls.filter(([n]) => n.startsWith('P')))('%s: cross-origin write is 403', async (_n, call) => {
    origin.mockReturnValue(false);
    expect((await call(ctx(PID))).status).toBe(403);
    expect(sql).not.toHaveBeenCalled();
  });
  it.each(calls)('%s: an unexpected error is a generic 503', async (_n, call) => {
    sql.mockImplementation((() => Promise.reject(new Error('connection to db-host-secret failed'))) as never);
    const res = await call(ctx(PID));
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain('db-host-secret');
  });
});

describe('GET quiz', () => {
  it('3 applicants is not eligible, 4 is', async () => {
    db.count = 3;
    expect(await (await getQuiz(req(undefined, 'GET'), ctx(PID))).json()).toMatchObject({ applicantCount: 3, minApplicants: 3, eligible: false, quiz: null });
    db.count = 4;
    expect(await (await getQuiz(req(undefined, 'GET'), ctx(PID))).json()).toMatchObject({ applicantCount: 4, eligible: true });
  });
  it('the count query excludes withdrawn applications', async () => {
    await getQuiz(req(undefined, 'GET'), ctx(PID));
    const countQuery = sql.mock.calls.map((c) => text(c[0])).find((q) => q.includes('count(*)::int'));
    expect(countQuery).toContain("status <> 'withdrawn'");
  });
  it('an open quiz stays valid after the count drops to 2 (latch)', async () => {
    db.count = 2;
    db.quiz = quizRow('open');
    const body = await (await getQuiz(req(undefined, 'GET'), ctx(PID))).json();
    expect(body.eligible).toBe(true);
    expect(body.quiz.status).toBe('open');
  });
  it('returns correct answers and rubric to the owner', async () => {
    db.quiz = quizRow('draft');
    const body = await (await getQuiz(req(undefined, 'GET'), ctx(PID))).json();
    expect(body.quiz.questions).toHaveLength(5);
    expect(body.quiz.questions[0].correctIndex).toBe(2);
    expect(body.quiz.questions[4].rubric).toContain('concrete feature');
  });
});

describe('POST generate', () => {
  it('creates the draft (201) when eligible and published', async () => {
    fetchMock.mockResolvedValue(geminiOk(five()));
    db.quiz = quizRow('draft');
    const res = await generate(req(), ctx(PID));
    expect(res.status).toBe(201);
    expect((await res.json()).quiz.questions).toHaveLength(5);
    expect(limiter).toHaveBeenCalledWith('quiz-generate', BIZ, 5);
    expect(sql.transaction).toHaveBeenCalledTimes(1);
  });
  it('sends only the project fields to the model', async () => {
    fetchMock.mockResolvedValue(geminiOk(five()));
    await generate(req(), ctx(PID));
    const body = String(fetchMock.mock.calls[0][1].body);
    expect(body).toContain('Orders get lost.');
    expect(body).not.toContain(BIZ);
  });
  it('409 when there are 3 applicants', async () => {
    db.count = 3;
    expect((await generate(req(), ctx(PID))).status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('409 when the project is not published', async () => {
    db.project = projectRow({ status: 'draft' });
    expect((await generate(req(), ctx(PID))).status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(['open', 'closed'])('409 when the quiz is already %s', async (status) => {
    db.quiz = quizRow(status);
    expect((await generate(req(), ctx(PID))).status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('429 when rate limited and does not call the model', async () => {
    limiter.mockResolvedValue(false);
    expect((await generate(req(), ctx(PID))).status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('502 with a generic message when the model keeps returning invalid output', async () => {
    fetchMock.mockResolvedValue(geminiOk(five().slice(0, 3)));
    const res = await generate(req(), ctx(PID));
    expect(res.status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(await res.json())).not.toMatch(/gemini|invalid_output|quiz-key/i);
    expect(sql.transaction).not.toHaveBeenCalled();
  });
  it('502 and no leak when the provider fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: { message: 'API key leaked quiz-key' } }) });
    const res = await generate(req(), ctx(PID));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain('quiz-key');
  });
  it('409 when the draft was opened concurrently', async () => {
    fetchMock.mockResolvedValue(geminiOk(five()));
    db.draftEditable = false;
    expect((await generate(req(), ctx(PID))).status).toBe(409);
  });
});

describe('PATCH quiz', () => {
  it('404 when there is no quiz yet', async () => {
    expect((await patchQuiz(req({ timeLimitSeconds: 600 }, 'PATCH'), ctx(PID))).status).toBe(404);
  });
  it.each(['open', 'closed'])('409: questions cannot be edited once %s', async (status) => {
    db.quiz = quizRow(status);
    expect((await patchQuiz(req({ questions: five() }, 'PATCH'), ctx(PID))).status).toBe(409);
    expect(sql.transaction).not.toHaveBeenCalled();
  });
  it('400 for 4 questions, a wrong mix, duplicate options, an out-of-range time and unknown keys', async () => {
    db.quiz = quizRow('draft');
    const dup = five(); dup[0] = { ...mcq(1), options: ['Same', 'same', 'x', 'y'] };
    const bodies = [{ questions: five().slice(0, 4) }, { questions: [mcq(1), mcq(2), mcq(3), mcq(4), mcq(5)] }, { questions: dup }, { timeLimitSeconds: 10 }, { status: 'open', timeLimitSeconds: 600 }, {}];
    for (const b of bodies) expect((await patchQuiz(req(b, 'PATCH'), ctx(PID))).status).toBe(400);
    expect((await patchQuiz(new Request('http://x/api', { method: 'PATCH', body: 'not json' }), ctx(PID))).status).toBe(400);
  });
  it('updates the time limit and the questions of a draft', async () => {
    db.quiz = quizRow('draft');
    expect((await patchQuiz(req({ timeLimitSeconds: 900 }, 'PATCH'), ctx(PID))).status).toBe(200);
    expect((await patchQuiz(req({ questions: five(), timeLimitSeconds: 900 }, 'PATCH'), ctx(PID))).status).toBe(200);
    expect(sql.transaction).toHaveBeenCalledTimes(1);
  });
  it('409 when the draft stops being a draft during the update', async () => {
    db.quiz = quizRow('draft');
    db.draftEditable = false;
    expect((await patchQuiz(req({ timeLimitSeconds: 900 }, 'PATCH'), ctx(PID))).status).toBe(409);
    expect((await patchQuiz(req({ questions: five() }, 'PATCH'), ctx(PID))).status).toBe(409);
  });
});

describe('open and close', () => {
  it('opens a valid draft for 72 hours', async () => {
    db.quiz = quizRow('draft');
    const res = await openQuiz(req(), ctx(PID));
    expect(res.status).toBe(200);
    const openCall = sql.mock.calls.find((c) => text(c[0]).includes("SET status = 'open'"));
    expect(openCall?.slice(1)).toContain(72);
  });
  it('404 with no quiz, 409 when not a draft', async () => {
    expect((await openQuiz(req(), ctx(PID))).status).toBe(404);
    db.quiz = quizRow('open');
    expect((await openQuiz(req(), ctx(PID))).status).toBe(409);
  });
  it('requires exactly 5 valid questions', async () => {
    db.quiz = quizRow('draft', stored(five()).slice(0, 4));
    expect((await openQuiz(req(), ctx(PID))).status).toBe(409);
    const broken = stored(five());
    broken[0] = { ...broken[0], options: ['a', 'a', 'b', 'c'] };
    db.quiz = quizRow('draft', broken);
    expect((await openQuiz(req(), ctx(PID))).status).toBe(409);
  });
  it('409 when the draft is no longer eligible or the project is unpublished', async () => {
    db.quiz = quizRow('draft');
    db.count = 3;
    expect((await openQuiz(req(), ctx(PID))).status).toBe(409);
    db.count = 4;
    db.project = projectRow({ status: 'closed' });
    expect((await openQuiz(req(), ctx(PID))).status).toBe(409);
  });
  it('409 when a concurrent open wins', async () => {
    db.quiz = quizRow('draft');
    db.openOk = false;
    expect((await openQuiz(req(), ctx(PID))).status).toBe(409);
  });
  it('closes an open quiz even when the count has dropped', async () => {
    db.count = 1;
    db.quiz = quizRow('open');
    expect((await closeQuiz(req(), ctx(PID))).status).toBe(200);
  });
  it('close: 404 with no quiz, 409 for a draft or a lost race', async () => {
    expect((await closeQuiz(req(), ctx(PID))).status).toBe(404);
    db.quiz = quizRow('draft');
    expect((await closeQuiz(req(), ctx(PID))).status).toBe(409);
    db.quiz = quizRow('open');
    db.closeOk = false;
    expect((await closeQuiz(req(), ctx(PID))).status).toBe(409);
  });
});

describe('GET results', () => {
  const row = (o = {}) => ({
    application_id: 'app1', student_id: 'stu1', full_name: 'Asha', attempt_status: 'submitted', mcq_score: 3, mcq_max: 4,
    short_score: 2, short_max: 4, proctoring_mode: 'full', time_taken_seconds: 312, short_answer: 'My answer', short_feedback: 'Good',
    counts: { tab_hidden: 2, no_face: 1 }, total_away_ms: 5400, ...o,
  });
  it('maps rows, including not_taken applicants, with the integrity summary', async () => {
    db.quiz = quizRow('open');
    db.resultRows = [row(), { application_id: 'app2', student_id: 'stu2', full_name: 'Ben', counts: {}, total_away_ms: 0 }];
    const body = await (await results(req(undefined, 'GET'), ctx(PID))).json();
    expect(body.items).toHaveLength(2);
    expect(body.items[0]).toEqual({
      applicationId: 'app1', studentId: 'stu1', displayName: 'Asha', status: 'submitted', mcqScore: 3, mcqMax: 4, shortScore: 2, shortMax: 4,
      shortAnswer: 'My answer', shortFeedback: 'Good', timeTakenSeconds: 312, proctoringMode: 'full',
      integrity: { counts: { tab_hidden: 2, no_face: 1 }, totalAwayMs: 5400 },
    });
    expect(body.items[1]).toMatchObject({ status: 'not_taken', mcqScore: null, shortScore: null, proctoringMode: null, integrity: { counts: {}, totalAwayMs: 0 } });
  });
  it('contains no email or contact fields, even if a row carried them', async () => {
    db.quiz = quizRow('closed');
    db.resultRows = [row({ email: 'asha@example.com', phone: '123', username: 'asha' })];
    const text_ = await (await results(req(undefined, 'GET'), ctx(PID))).text();
    expect(text_).not.toMatch(/email|asha@example|phone|username/i);
    const query = sql.mock.calls.map((c) => text(c[0])).find((q) => q.includes('FROM skillbridge.applications a')) ?? '';
    expect(query).not.toMatch(/email|phone|username/i);
    expect(query).toContain("a.status <> 'withdrawn'");
  });
  it('uses one aggregate query for all integrity events', async () => {
    db.quiz = quizRow('open');
    db.resultRows = [row(), row({ application_id: 'app2' }), row({ application_id: 'app3' })];
    await results(req(undefined, 'GET'), ctx(PID));
    const eventQueries = sql.mock.calls.map((c) => text(c[0])).filter((q) => q.includes('quiz_integrity_events'));
    expect(eventQueries).toHaveLength(1);
  });
  it('404 when the project has no quiz', async () => {
    expect((await results(req(undefined, 'GET'), ctx(PID))).status).toBe(404);
  });
});
