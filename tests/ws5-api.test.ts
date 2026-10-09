import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const sql = vi.hoisted(() => vi.fn());
const current = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ database: () => sql }));
vi.mock('@/lib/auth/profile', () => ({ currentProfile: current }));
vi.mock('@/lib/auth/security', () => ({ sameOrigin: () => true, rateLimit: async () => true }));
import { GET as discover } from '@/app/api/projects/discover/route';
import { GET as recommend } from '@/app/api/projects/[id]/recommendations/route';
import { POST as apply } from '@/app/api/projects/[id]/applications/route';
import { GET as businessApps } from '@/app/api/business/projects/[id]/applications/route';
import { PATCH as setStatus } from '@/app/api/applications/[id]/status/route';

const PID = '11111111-1111-4111-8111-111111111111';
const AID = '22222222-2222-4222-8222-222222222222';
const BIZ = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const STU = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const as = (role: string, id: string) => current.mockResolvedValue({ user: { id: 'u', emailVerified: true }, profile: { id, role, onboarding_completed: true } });
const req = (body?: unknown, url = 'http://x/api') => new Request(url, { method: 'POST', body: JSON.stringify(body) });
const projectRow = (o = {}) => ({ id: PID, title: 'Cafe site', summary: '', problem_statement: '', category: 'Web', required_skills: ['React'], remote_ok: true, location_text: null, status: 'published', owner_profile_id: BIZ, ...o });
const studentRow = { id: 's1', full_name: 'Asha', email: 'asha@example.com', bio: 'hi', skills: ['React'], interests: [], preferred_categories: [], availability_hours_per_week: 5, remote_preference: 'either', visibility: 'public' };

beforeEach(() => { vi.resetAllMocks(); });

describe('auth and ownership', () => {
  it('returns 401 when signed out', async () => {
    current.mockResolvedValue(null);
    expect((await recommend(req(), ctx(PID))).status).toBe(401);
    expect((await apply(req({ cover_note: 'x' }), ctx(PID))).status).toBe(401);
    expect((await setStatus(req({ status: 'viewed' }), ctx(AID))).status).toBe(401);
  });
  it('returns 403 when a student calls a business route', async () => {
    as('student', STU);
    expect((await businessApps(req(), ctx(PID))).status).toBe(403);
    expect((await recommend(req(), ctx(PID))).status).toBe(403);
  });
  it('returns 403 when a business views another owner\'s applications', async () => {
    as('business', BIZ);
    sql.mockResolvedValueOnce([projectRow({ owner_profile_id: 'someone-else' })]);
    expect((await businessApps(req(), ctx(PID))).status).toBe(403);
  });
  it('returns 404 for malformed ids', async () => {
    as('business', BIZ);
    expect((await businessApps(req(), ctx('nope'))).status).toBe(404);
  });
});

describe('applying', () => {
  beforeEach(() => as('student', STU));
  it('rejects a project that is not published', async () => {
    sql.mockResolvedValueOnce([{ id: 's1' }]).mockResolvedValueOnce([projectRow({ status: 'draft' })]);
    expect((await apply(req({ cover_note: 'Hello' }), ctx(PID))).status).toBe(404);
  });
  it('rejects an empty or oversized cover note', async () => {
    expect((await apply(req({ cover_note: '   ' }), ctx(PID))).status).toBe(400);
    expect((await apply(req({ cover_note: 'a'.repeat(2001) }), ctx(PID))).status).toBe(400);
  });
  it('returns 409 on a duplicate application', async () => {
    sql.mockResolvedValueOnce([{ id: 's1' }]).mockResolvedValueOnce([projectRow()]).mockRejectedValueOnce({ code: '23505' });
    const res = await apply(req({ cover_note: 'Hello' }), ctx(PID));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('You have already applied');
  });
  it('creates an application with the session identity', async () => {
    sql.mockResolvedValueOnce([{ id: 's1' }]).mockResolvedValueOnce([projectRow()]).mockResolvedValueOnce([{ id: AID, status: 'submitted' }]);
    expect((await apply(req({ cover_note: ' Hello ', student_id: 'evil' }), ctx(PID))).status).toBe(201);
    expect(sql.mock.calls[2].slice(1)).toEqual([PID, 's1', 'Hello', PID]);
  });
});

describe('status transitions', () => {
  const app = (status: string) => ({ id: AID, status, owner_profile_id: BIZ, student_profile_id: STU });
  it('rejects accepted -> shortlisted for the owner with 409', async () => {
    as('business', BIZ);
    sql.mockResolvedValueOnce([app('accepted')]);
    expect((await setStatus(req({ status: 'shortlisted' }), ctx(AID))).status).toBe(409);
  });
  it('rejects a student trying to shortlist with 409', async () => {
    as('student', STU);
    sql.mockResolvedValueOnce([app('submitted')]);
    expect((await setStatus(req({ status: 'shortlisted' }), ctx(AID))).status).toBe(409);
  });
  it('lets the applicant withdraw', async () => {
    as('student', STU);
    sql.mockResolvedValueOnce([app('viewed')]).mockResolvedValueOnce([{ id: AID, status: 'withdrawn' }]);
    expect((await setStatus(req({ status: 'withdrawn' }), ctx(AID))).status).toBe(200);
  });
  it('returns 409 when a concurrent update wins the race', async () => {
    as('business', BIZ);
    sql.mockResolvedValueOnce([app('submitted')]).mockResolvedValueOnce([]);
    expect((await setStatus(req({ status: 'viewed' }), ctx(AID))).status).toBe(409);
  });
  it('hides applications from unrelated users', async () => {
    as('business', 'other-owner');
    sql.mockResolvedValueOnce([app('submitted')]);
    expect((await setStatus(req({ status: 'viewed' }), ctx(AID))).status).toBe(404);
  });
});

describe('discover and candidates', () => {
  it('clamps pagination and returns an empty page', async () => {
    sql.mockResolvedValueOnce([]);
    const res = await discover(new Request('http://x/api/projects/discover?pageSize=999&page=-4'));
    expect(await res.json()).toEqual({ items: [], total: 0, page: 1, pageSize: 50 });
    expect(sql.mock.calls[0].slice(1)).toContain(50);
  });
  it('escapes LIKE wildcards in q', async () => {
    sql.mockResolvedValueOnce([]);
    await discover(new Request('http://x/api/projects/discover?q=100%25_x'));
    expect(sql.mock.calls[0].slice(1)).toContain('%100\\%\\_x%');
  });
  it('never exposes email in recommended candidates', async () => {
    as('business', BIZ);
    sql.mockResolvedValueOnce([projectRow()]).mockResolvedValueOnce([studentRow]).mockResolvedValueOnce([]);
    const res = await recommend(req(), ctx(PID));
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).toContain('Lists required skill \\"React\\"');
    expect(text).not.toMatch(/email|asha@example/i);
  });
});
