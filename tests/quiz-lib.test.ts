import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { isEligible } from '@/lib/quiz/repo';
import { editQuizSchema, generatedQuizSchema, questionsSchema } from '@/lib/quiz/schema';
import {
  buildQuizPrompt, generateQuiz, pickQuizSource, QuizGenerationError, shuffleOptions, sourceHash,
} from '@/lib/quiz/generate';

const mcq = (n: number, over: Record<string, unknown> = {}) => ({
  kind: 'mcq', prompt: `Scenario question number ${n} for the shop?`,
  options: [`A${n} first`, `B${n} second`, `C${n} third`, `D${n} fourth`], correctIndex: 1, ...over,
});
const short = { kind: 'short', prompt: 'Describe how you would handle a rush at the counter.', rubric: 'Names a concrete feature and links it to staff workflow.' };
const valid = () => [mcq(1), mcq(2), mcq(3), mcq(4), short];

describe('quiz schema', () => {
  it('accepts exactly 4 mcq + 1 short', () => {
    expect(questionsSchema.safeParse(valid()).success).toBe(true);
  });
  it('rejects 4 and 6 questions', () => {
    expect(questionsSchema.safeParse(valid().slice(0, 4)).success).toBe(false);
    expect(questionsSchema.safeParse([...valid(), mcq(5)]).success).toBe(false);
  });
  it('rejects the wrong mix of kinds', () => {
    expect(questionsSchema.safeParse([mcq(1), mcq(2), mcq(3), mcq(4), mcq(5)]).success).toBe(false);
    expect(questionsSchema.safeParse([mcq(1), mcq(2), mcq(3), short, short]).success).toBe(false);
  });
  it('rejects duplicate options, ignoring case and spacing', () => {
    expect(questionsSchema.safeParse([mcq(1, { options: ['Same', ' same ', 'Other', 'Third'] }), ...valid().slice(1)]).success).toBe(false);
  });
  it('rejects a wrong option count and out-of-range correctIndex', () => {
    expect(questionsSchema.safeParse([mcq(1, { options: ['a', 'b', 'c'] }), ...valid().slice(1)]).success).toBe(false);
    expect(questionsSchema.safeParse([mcq(1, { correctIndex: 4 }), ...valid().slice(1)]).success).toBe(false);
    expect(questionsSchema.safeParse([mcq(1, { correctIndex: -1 }), ...valid().slice(1)]).success).toBe(false);
    expect(questionsSchema.safeParse([mcq(1, { correctIndex: 1.5 }), ...valid().slice(1)]).success).toBe(false);
  });
  it('rejects short prompts, missing rubric and unknown keys', () => {
    expect(questionsSchema.safeParse([mcq(1, { prompt: 'too short' }), ...valid().slice(1)]).success).toBe(false);
    expect(questionsSchema.safeParse([mcq(1, { prompt: 'x'.repeat(601) }), ...valid().slice(1)]).success).toBe(false);
    expect(questionsSchema.safeParse([...valid().slice(0, 4), { kind: 'short', prompt: short.prompt }]).success).toBe(false);
    expect(questionsSchema.safeParse([mcq(1, { extra: 1 }), ...valid().slice(1)]).success).toBe(false);
  });
  it('validates the PATCH body', () => {
    expect(editQuizSchema.safeParse({}).success).toBe(false);
    expect(editQuizSchema.safeParse({ timeLimitSeconds: 299 }).success).toBe(false);
    expect(editQuizSchema.safeParse({ timeLimitSeconds: 1801 }).success).toBe(false);
    expect(editQuizSchema.safeParse({ timeLimitSeconds: 300 }).success).toBe(true);
    expect(editQuizSchema.safeParse({ timeLimitSeconds: 1800 }).success).toBe(true);
    expect(editQuizSchema.safeParse({ questions: valid() }).success).toBe(true);
    expect(editQuizSchema.safeParse({ questions: valid().slice(0, 4) }).success).toBe(false);
    expect(editQuizSchema.safeParse({ status: 'open', timeLimitSeconds: 600 }).success).toBe(false);
  });
});

describe('eligibility and latch', () => {
  it('needs MORE than 3 applicants', () => {
    expect(isEligible(3, null)).toBe(false);
    expect(isEligible(4, null)).toBe(true);
    expect(isEligible(0, { status: 'draft' })).toBe(false);
  });
  it('stays valid once open or closed even when the count drops', () => {
    expect(isEligible(2, { status: 'open' })).toBe(true);
    expect(isEligible(0, { status: 'closed' })).toBe(true);
  });
});

const source = {
  title: 'Snack shop order tracker', summary: 'Track counter orders', problem_statement: 'Orders arrive by WhatsApp and phone and get lost.',
  category: 'Web', required_skills: ['React'], deliverables: ['Order dashboard'],
};
const geminiOk = (questions: unknown) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ questions }) }] } }] }) });
const geminiRaw = (text: string) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) });
const geminiStatus = (status: number) => ({ ok: false, status, json: async () => ({ error: { message: 'secret provider detail' } }) });
const fetchMock = vi.fn();

describe('generateQuiz', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    process.env.GEMINI_QUIZ_API_KEY = 'quiz-key';
    delete process.env.GEMINI_API_KEY;
    delete process.env.QUIZ_MODEL;
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('sends the key in a header, never in the URL, with JSON mode', async () => {
    fetchMock.mockResolvedValue(geminiOk(valid()));
    const out = await generateQuiz(source);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/models/gemini-3.5-flash:generateContent');
    expect(String(url)).not.toContain('quiz-key');
    expect(init.headers['x-goog-api-key']).toBe('quiz-key');
    expect(JSON.parse(init.body).generationConfig).toMatchObject({ responseMimeType: 'application/json', temperature: 0.4 });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(out.model).toBe('gemini-3.5-flash');
    expect(out.questions).toHaveLength(5);
  });
  it('honours QUIZ_MODEL and falls back to GEMINI_API_KEY', async () => {
    delete process.env.GEMINI_QUIZ_API_KEY;
    process.env.GEMINI_API_KEY = 'general-key';
    process.env.QUIZ_MODEL = 'custom-model';
    fetchMock.mockResolvedValue(geminiOk(valid()));
    await generateQuiz(source);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/models/custom-model:');
    expect(fetchMock.mock.calls[0][1].headers['x-goog-api-key']).toBe('general-key');
  });
  it('fails closed without a key and makes no request', async () => {
    delete process.env.GEMINI_QUIZ_API_KEY;
    await expect(generateQuiz(source)).rejects.toMatchObject({ code: 'not_configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('retries once on invalid output and then succeeds', async () => {
    fetchMock.mockResolvedValueOnce(geminiOk(valid().slice(0, 4))).mockResolvedValueOnce(geminiOk(valid()));
    await expect(generateQuiz(source)).resolves.toMatchObject({ model: 'gemini-3.5-flash' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('retries once on unparsable JSON, then fails closed with a typed error', async () => {
    fetchMock.mockResolvedValue(geminiRaw('not json {'));
    const err = await generateQuiz(source).catch((e) => e);
    expect(err).toBeInstanceOf(QuizGenerationError);
    expect(err.code).toBe('invalid_output');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('fails closed after two invalid outputs', async () => {
    fetchMock.mockResolvedValue(geminiOk(valid().slice(0, 3)));
    await expect(generateQuiz(source)).rejects.toMatchObject({ code: 'invalid_output' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('retries one transient provider status, but not a 400, and never exposes provider text', async () => {
    fetchMock.mockResolvedValueOnce(geminiStatus(503)).mockResolvedValueOnce(geminiOk(valid()));
    await expect(generateQuiz(source)).resolves.toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(geminiStatus(400));
    const err = await generateQuiz(source).catch((e) => e);
    expect(err.code).toBe('provider');
    expect(err.message).not.toContain('secret provider detail');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('fails closed without retry on network errors and timeouts', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    await expect(generateQuiz(source)).rejects.toMatchObject({ code: 'provider' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('ignores thought parts in the response', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [
      { text: 'thinking...', thought: true }, { text: JSON.stringify({ questions: valid() }) },
    ] } }] }) });
    await expect(generateQuiz(source)).resolves.toBeTruthy();
  });
  it('keeps the correct answer correct after shuffling', () => {
    for (let i = 0; i < 50; i++) {
      const original = generatedQuizSchema.parse({ questions: valid() }).questions[0];
      const shuffled = shuffleOptions(original);
      if (original.kind !== 'mcq' || shuffled.kind !== 'mcq') throw new Error('expected mcq');
      expect(shuffled.options[shuffled.correctIndex]).toBe(original.options[original.correctIndex]);
      expect([...shuffled.options].sort()).toEqual([...original.options].sort());
    }
    expect(shuffleOptions(valid()[4] as never)).toEqual(valid()[4]);
  });
});

describe('prompt input', () => {
  const dirty = {
    ...source, id: 'p1', email: 'student@example.com', full_name: 'Asha Student', bio: 'secret student bio', owner_profile_id: 'o1',
    embedding: [0.1], skills: ['Python'], knowledge_chunks: 'TEMPLATE TEXT',
  };
  it('picks only the six project fields', () => {
    expect(Object.keys(pickQuizSource(dirty)).sort()).toEqual(
      ['category', 'deliverables', 'problem_statement', 'required_skills', 'summary', 'title'],
    );
  });
  it('sends the project fields and nothing about students or templates', async () => {
    fetchMock.mockResolvedValue(geminiOk(valid()));
    vi.stubGlobal('fetch', fetchMock);
    process.env.GEMINI_QUIZ_API_KEY = 'k';
    await generateQuiz(pickQuizSource(dirty));
    const body = String(fetchMock.mock.calls.at(-1)?.[1].body);
    for (const field of [source.title, source.summary, source.problem_statement, 'React', 'Order dashboard']) expect(body).toContain(field);
    for (const leak of ['student@example.com', 'Asha', 'secret student bio', 'Python', 'TEMPLATE TEXT']) expect(body).not.toContain(leak);
  });
  it('builds the prompt from the project fields only', () => {
    expect(buildQuizPrompt(source)).toBe(`<project>
Title: Snack shop order tracker
Category: Web
Summary: Track counter orders
Problem statement: Orders arrive by WhatsApp and phone and get lost.
Required skills: React
Deliverables: Order dashboard
</project>`);
  });
  it('hashes only the project fields and changes with them', () => {
    expect(sourceHash(source)).toBe(sourceHash(pickQuizSource(dirty)));
    expect(sourceHash(source)).toMatch(/^[0-9a-f]{64}$/);
    expect(sourceHash({ ...source, title: 'Other' })).not.toBe(sourceHash(source));
  });
});
