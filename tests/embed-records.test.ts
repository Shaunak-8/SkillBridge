import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const sql = vi.hoisted(() => vi.fn());
const embed = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ database: () => sql }));
vi.mock('@/lib/ai/embeddings', () => ({ EMBEDDING_MODEL: 'test-model', generateDocumentEmbedding: embed }));
import { embedProject, embedStudentByProfile, scheduleEmbedding } from '@/lib/ai/embed-records';

const VEC = [0.1, 0.2, 0.3];
const text = (call: unknown[]) => (call[0] as string[]).join('?');
const writes = () => sql.mock.calls.filter((c) => /^\s*UPDATE/.test(text(c)));
const project = { title: 'Snack shop tracker', summary: 'Track orders', problem_statement: 'Orders get lost', category: 'Retail', required_skills: ['React', 'SQL'], version: 'v1' };
const student = { id: 'S1', visibility: 'matching', bio: 'Loves data', skills: ['Python'], interests: ['Health'], preferred_categories: ['Education'], version: 'v1' };
const item = { title: 'Shop app', description: 'Built a kirana store app', skills_used: ['React'] };

beforeEach(() => { vi.resetAllMocks(); vi.spyOn(console, 'warn').mockImplementation(() => {}); });

describe('embedProject', () => {
  it('embeds the project document and stores it with the model name', async () => {
    sql.mockResolvedValueOnce([project]).mockResolvedValueOnce([{ id: 'P1' }]);
    embed.mockResolvedValue(VEC);
    expect(await embedProject('P1')).toBe('embedded');
    expect(embed).toHaveBeenCalledWith('Snack shop tracker Track orders Orders get lost Retail React SQL');
    const [call] = writes();
    expect(call.slice(1)).toEqual([JSON.stringify(VEC), 'test-model', 'P1', 'v1']);
    expect(text(call)).toContain('updated_at::text =');
  });
  it('skips projects that are not published', async () => {
    sql.mockResolvedValueOnce([]);
    expect(await embedProject('P1')).toBe('skipped');
    expect(embed).not.toHaveBeenCalled();
    expect(writes()).toHaveLength(0);
    expect(text(sql.mock.calls[0])).toContain("status = 'published'");
  });
  it('reports a skip when the row changed during embedding (race guard)', async () => {
    sql.mockResolvedValueOnce([project]).mockResolvedValueOnce([]);
    embed.mockResolvedValue(VEC);
    expect(await embedProject('P1')).toBe('skipped');
    expect(writes()[0].slice(1)).toContain('v1');
  });
  it.each([['null', () => embed.mockResolvedValue(null)], ['a throw', () => embed.mockRejectedValue(new Error('SECRET-text'))]])(
    'never throws or writes when the embedding is %s', async (_n, arrange) => {
      sql.mockResolvedValueOnce([project]);
      arrange();
      await expect(embedProject('P1')).resolves.toBe('failed');
      expect(writes()).toHaveLength(0);
      expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('SECRET');
    });
  it('never throws when the database fails', async () => {
    sql.mockRejectedValue(Object.assign(new Error('boom with text'), { code: '57P01' }));
    await expect(embedProject('P1')).resolves.toBe('failed');
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).toContain('57P01');
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('boom');
  });
});

describe('embedStudentByProfile', () => {
  it('builds the document from profile and portfolio only, never name or contact fields', async () => {
    sql.mockResolvedValueOnce([student]).mockResolvedValueOnce([item]).mockResolvedValueOnce([{ id: 'S1' }]);
    embed.mockResolvedValue(VEC);
    expect(await embedStudentByProfile('PR1')).toBe('embedded');
    expect(embed).toHaveBeenCalledWith('Loves data Python Health Education Shop app Built a kirana store app React');
    const selects = sql.mock.calls.slice(0, 2).map(text).join('\n');
    expect(selects).not.toMatch(/full_name|email|phone|linkedin|contact/i);
    expect(writes()[0].slice(1)).toEqual([JSON.stringify(VEC), 'test-model', 'S1', 'v1']);
  });
  it('clears the vector for private students without calling the embedding API', async () => {
    sql.mockResolvedValue([{ ...student, visibility: 'private' }]);
    expect(await embedStudentByProfile('PR1')).toBe('cleared');
    expect(embed).not.toHaveBeenCalled();
    const [call] = writes();
    expect(text(call)).toMatch(/embedding = NULL, embedding_model = NULL, embedded_at = NULL/);
    expect(text(call)).toContain("visibility = 'private'");
  });
  it('does nothing when the student has no profile row', async () => {
    sql.mockResolvedValueOnce([]);
    expect(await embedStudentByProfile('PR1')).toBe('skipped');
    expect(sql).toHaveBeenCalledTimes(1);
  });
  it('does not mark a stale vector fresh when the profile changed during embedding', async () => {
    sql.mockResolvedValueOnce([student]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    embed.mockResolvedValue(VEC);
    expect(await embedStudentByProfile('PR1')).toBe('skipped');
    expect(text(writes()[0])).toContain('updated_at::text =');
  });
  it('swallows null and throwing embeddings', async () => {
    sql.mockResolvedValue([student]);
    embed.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('x'));
    await expect(embedStudentByProfile('PR1')).resolves.toBe('failed');
    await expect(embedStudentByProfile('PR1')).resolves.toBe('failed');
    expect(writes()).toHaveLength(0);
  });
});

describe('scheduleEmbedding', () => {
  it('runs the task in the background when there is no request scope, and swallows its failure', async () => {
    const task = vi.fn().mockRejectedValue(new Error('nope'));
    expect(() => scheduleEmbedding(task)).not.toThrow();
    expect(task).toHaveBeenCalledTimes(1);
    await Promise.resolve();
  });
});
