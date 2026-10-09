import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const sql = vi.hoisted(() => vi.fn());
const current = vi.hoisted(() => vi.fn());
const origin = vi.hoisted(() => ({ ok: true }));
vi.mock('@/lib/db', () => ({ database: () => sql }));
vi.mock('@/lib/auth/profile', () => ({ currentProfile: current }));
vi.mock('@/lib/auth/security', () => ({ sameOrigin: () => origin.ok, rateLimit: async () => true }));
import { GET as getMe, PATCH as patchMe } from '@/app/api/students/me/route';
import { POST as addItem } from '@/app/api/students/me/portfolio/route';
import { PATCH as editItem, DELETE as removeItem } from '@/app/api/students/me/portfolio/[itemId]/route';

const PROFILE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const STUDENT = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ITEM = '11111111-1111-4111-8111-111111111111';
const ctx = { params: Promise.resolve({ itemId: ITEM }) };
const as = (role: string) => current.mockResolvedValue({ user: { id: 'u', emailVerified: true }, profile: { id: PROFILE, role, onboarding_completed: true } });
const json = (method: string, body: unknown) => new Request('http://x/api', { method, body: JSON.stringify(body) });
const when = '2025-01-01T00:00:00.000Z';
const profileRow = { id: STUDENT, profile_id: PROFILE, full_name: 'Asha', bio: '', education_level: null, field_of_study: '', study_year: 3,
  skills: ['React'], interests: [], learning_goals: [], preferred_categories: [], availability_hours_per_week: 8, availability: 'Weekends',
  availability_notes: '', visibility: 'private', created_at: when, updated_at: when };
const itemRow = { id: ITEM, student_id: STUDENT, title: 'Shop app', description: 'Built a shop app', role: '', skills_used: ['React'], project_url: null, media_url: null, created_at: when, updated_at: when };
const validItem = { title: 'Shop app', description: 'Built a shop app for a kirana store' };
const statements = () => sql.mock.calls.map((c) => (c[0] as string[]).join('?'));

beforeEach(() => { vi.resetAllMocks(); origin.ok = true; });

describe('auth', () => {
  it('rejects signed-out and non-student callers', async () => {
    current.mockResolvedValue(null);
    expect((await getMe()).status).toBe(401);
    as('business');
    expect((await getMe()).status).toBe(403);
    expect((await addItem(json('POST', validItem))).status).toBe(403);
  });
  it('rejects cross-origin writes before touching the database', async () => {
    as('student');
    origin.ok = false;
    expect((await patchMe(json('PATCH', { bio: 'x' }))).status).toBe(403);
    expect((await removeItem(json('DELETE', {}), ctx)).status).toBe(403);
    expect(sql).not.toHaveBeenCalled();
  });
});

describe('profile', () => {
  it('maps skillbridge columns onto the WS4 DTO', async () => {
    as('student');
    sql.mockResolvedValueOnce([profileRow]).mockResolvedValueOnce([itemRow]);
    const { data } = await (await getMe()).json();
    expect(data).toMatchObject({ id: STUDENT, displayName: 'Asha', studyYear: '3rd Year', visibility: 'draft_private',
      availability: { hoursPerWeek: 8, schedulePreference: 'Weekends' } });
    expect(data.portfolioItems).toHaveLength(1);
  });
  it('creates the empty profile only on first access, then reads it again', async () => {
    as('student');
    // read: no profile row, no portfolio -> insert -> read again
    sql.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([profileRow]).mockResolvedValueOnce([]);
    const { data } = await (await getMe()).json();
    expect(data.id).toBe(STUDENT);
    expect(statements().filter((s) => s.includes('INSERT INTO skillbridge.student_profiles'))).toHaveLength(1);
  });
  it('does not write when the profile already exists', async () => {
    as('student');
    sql.mockResolvedValueOnce([profileRow]).mockResolvedValueOnce([]);
    expect((await getMe()).status).toBe(200);
    expect(statements().some((s) => s.includes('INSERT'))).toBe(false);
  });
  it('bumps updated_at on profile edits and uses the session profile id only', async () => {
    as('student');
    sql.mockResolvedValue([profileRow]);
    const res = await patchMe(json('PATCH', { bio: 'Hello there', profileId: 'attacker', userId: 'attacker' }));
    expect(res.status).toBe(200);
    const update = sql.mock.calls.find((c) => (c[0] as string[]).join('?').includes('UPDATE skillbridge.student_profiles'))!;
    expect((update[0] as string[]).join('?')).toContain('updated_at = now()');
    expect(update.slice(1)).toContain(PROFILE);
    expect(update.slice(1)).not.toContain('attacker');
  });
  it('rejects invalid payloads with 400', async () => {
    as('student');
    expect((await patchMe(json('PATCH', { displayName: 'x' }))).status).toBe(400);
    expect((await patchMe(json('PATCH', null))).status).toBe(400);
  });
});

describe('portfolio', () => {
  beforeEach(() => as('student'));
  it('creates an item for the session student and invalidates the embedding', async () => {
    sql.mockResolvedValueOnce([profileRow]).mockResolvedValueOnce([itemRow]).mockResolvedValueOnce([itemRow]).mockResolvedValue([]);
    const res = await addItem(json('POST', { ...validItem, javascript: 1, mediaUrl: 'javascript:alert(1)' }));
    expect(res.status).toBe(400);
    sql.mockReset();
    sql.mockResolvedValueOnce([profileRow]).mockResolvedValueOnce([]).mockResolvedValueOnce([itemRow]).mockResolvedValue([]);
    expect((await addItem(json('POST', validItem))).status).toBe(201);
    expect(statements().some((s) => s.includes('UPDATE skillbridge.student_profiles SET updated_at = now()'))).toBe(true);
  });
  it('returns 404 for another student\'s item or a malformed id, without bumping updated_at', async () => {
    sql.mockResolvedValueOnce([profileRow]).mockResolvedValueOnce([]).mockResolvedValue([]);
    expect((await editItem(json('PATCH', validItem), ctx)).status).toBe(404);
    expect((await removeItem(json('DELETE', {}), { params: Promise.resolve({ itemId: 'nope' }) })).status).toBe(404);
    expect(statements().some((s) => s.includes('SET updated_at = now()'))).toBe(false);
    const update = sql.mock.calls.find((c) => (c[0] as string[]).join('?').includes('student_portfolio_items SET'))!;
    expect(update.slice(1)).toContain(STUDENT);
  });
  it('deletes an owned item and bumps the profile', async () => {
    sql.mockResolvedValueOnce([profileRow]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: ITEM }]).mockResolvedValue([]);
    expect((await removeItem(json('DELETE', {}), ctx)).status).toBe(200);
    expect(statements().some((s) => s.includes('SET updated_at = now()'))).toBe(true);
  });
});
