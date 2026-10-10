import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const sql = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ database: () => sql }));
import { parseDirectoryParams, searchStudents, toDirectoryStudent } from '@/lib/ws5/students-directory';

const row = (o = {}) => ({
  id: 's1', full_name: 'Asha Rao', bio: 'Builds React apps', skills: ['React'], interests: ['Retail'], preferred_categories: ['Web'],
  availability_hours_per_week: 10, remote_preference: 'remote', portfolio: [{ title: 'Shop site', skillsUsed: ['React'] }], total: '1', ...o,
});
/** SQL text and bound values of the nth call. */
const call = (n = 0) => { const [strings, ...values] = sql.mock.calls[n] as [string[], ...unknown[]]; return { text: strings.join('?'), values }; };

beforeEach(() => { vi.resetAllMocks(); sql.mockResolvedValue([row()]); });

describe('searchStudents SQL', () => {
  it('only lists opted-in students and never selects contact or auth fields', async () => {
    await searchStudents();
    const { text } = call();
    expect(text).toContain("sp.visibility IN ('public', 'matching')");
    expect(text).not.toMatch(/email|username|auth_user_id|profile_id\s+AS|sp\.profile_id,|pr\.id\s+AS/i);
    expect(text).toContain('LIMIT ? OFFSET ?');
  });
  it('binds a hostile q as a value, never into the SQL text', async () => {
    const hostile = "%'; DROP TABLE skillbridge.profiles; --";
    await searchStudents({ q: hostile });
    const { text, values } = call();
    expect(text).not.toContain('DROP');
    expect(values).toContain("%\\%'; DROP TABLE skillbridge.profiles; --%");
  });
  it('escapes LIKE wildcards and backslashes', async () => {
    await searchStudents({ q: '50%_\\x' });
    expect(call().values).toContain('%50\\%\\_\\\\x%');
  });
  it('passes null for absent filters so they are skipped', async () => {
    await searchStudents({ q: '  ', skill: '', minHours: null });
    expect(call().values.filter((v) => v === null).length).toBeGreaterThanOrEqual(4);
  });
  it('binds skill and minHours and clamps minHours to 0..80', async () => {
    await searchStudents({ skill: 'React', minHours: 500 });
    expect(call().values).toEqual(expect.arrayContaining(['React', 80]));
    await searchStudents({ minHours: -5 });
    expect(call(1).values).toContain(0);
  });
  it('clamps page and pageSize', async () => {
    expect(await searchStudents({ page: -3, pageSize: 9999 })).toMatchObject({ page: 1, pageSize: 50 });
    expect(await searchStudents({ page: 3, pageSize: 0 })).toMatchObject({ page: 3, pageSize: 1 });
    expect(await searchStudents({ page: Number.NaN })).toMatchObject({ page: 1, pageSize: 12 });
    expect(call(0).values.slice(-2)).toEqual([50, 0]);
    expect(call(1).values.slice(-2)).toEqual([1, 2]);
  });
  it('caps text filters at 100 characters', async () => {
    await searchStudents({ skill: 'x'.repeat(500) });
    expect(call().values).toContain('x'.repeat(100));
  });
});

describe('searchStudents result', () => {
  it('returns total from count(*) OVER() and mapped items without it', async () => {
    sql.mockResolvedValue([row({ total: '31' })]);
    const res = await searchStudents({ page: 2 });
    expect(res.total).toBe(31);
    expect(Object.keys(res.items[0]).sort()).toEqual(['availabilityHoursPerWeek', 'bio', 'displayName', 'id', 'interests', 'portfolio', 'preferredCategories', 'remotePreference', 'skills']);
  });
  it('reports zero when no rows match', async () => {
    sql.mockResolvedValue([]);
    expect(await searchStudents({ q: 'zzz' })).toEqual({ items: [], total: 0, page: 1, pageSize: 12 });
  });
  it('drops any extra column a row might carry', () => {
    const out = toDirectoryStudent(row({ email: 'a@b.c', username: 'asha', auth_user_id: 'u', profile_id: 'p', phone: '1' }));
    expect(JSON.stringify(out)).not.toMatch(/a@b\.c|asha"|"u"|"p"|phone/);
  });
  it('truncates long bios, defaults the name and tolerates missing arrays', () => {
    const out = toDirectoryStudent({ id: 'x', full_name: null, bio: 'b'.repeat(300), portfolio: null });
    expect(out.bio).toHaveLength(241);
    expect(out.bio?.endsWith('…')).toBe(true);
    expect(out).toMatchObject({ displayName: 'Student', skills: [], interests: [], portfolio: [], availabilityHoursPerWeek: null });
  });
  it('keeps at most 3 portfolio items with only title and skills', () => {
    const portfolio = Array.from({ length: 5 }, (_, i) => ({ title: `P${i}`, skillsUsed: ['a'], description: 'secret', project_url: 'u' }));
    const out = toDirectoryStudent(row({ portfolio }));
    expect(out.portfolio).toHaveLength(3);
    expect(Object.keys(out.portfolio[0])).toEqual(['title', 'skillsUsed']);
  });
});

describe('parseDirectoryParams', () => {
  it('returns defaults for empty input', () => {
    expect(parseDirectoryParams({})).toEqual({ q: null, skill: null, minHours: null, page: 1 });
  });
  it('trims, caps at 100 chars and takes the first array value', () => {
    const p = parseDirectoryParams({ q: `  ${'a'.repeat(300)}  `, skill: ['React', 'Vue'] });
    expect(p.q).toHaveLength(100);
    expect(p.skill).toBe('React');
  });
  it('clamps minHours to 0..80 and rejects garbage', () => {
    expect(parseDirectoryParams({ minHours: '999' }).minHours).toBe(80);
    expect(parseDirectoryParams({ minHours: '-4' }).minHours).toBe(0);
    expect(parseDirectoryParams({ minHours: 'abc' }).minHours).toBeNull();
    expect(parseDirectoryParams({ minHours: '15' }).minHours).toBe(15);
  });
  it('keeps page >= 1', () => {
    expect(parseDirectoryParams({ page: '0' }).page).toBe(1);
    expect(parseDirectoryParams({ page: '-2' }).page).toBe(1);
    expect(parseDirectoryParams({ page: 'x' }).page).toBe(1);
    expect(parseDirectoryParams({ page: '4' }).page).toBe(4);
  });
});
