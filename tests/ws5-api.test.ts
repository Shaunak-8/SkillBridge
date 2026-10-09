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
import { EmbeddingRetriever, LexicalRetriever } from '@/lib/matching/retriever';
import { loadProjectRecommendationInput, loadStudentByProfile, loadStudentRecommendationInput } from '@/lib/ws5/repo';

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
    sql.mockResolvedValueOnce([projectRow({ owner_profile_id: 'someone-else' })]).mockResolvedValueOnce([{ ...studentRow, application_id: AID, total: 1 }]);
    const res = await businessApps(req(), ctx(PID));
    expect(res.status).toBe(403);
    expect(await res.text()).not.toContain('Asha');
  });
  it('returns 403 and no candidates when a business asks for another owner\'s recommendations', async () => {
    as('business', BIZ);
    sql.mockResolvedValueOnce([projectRow({ owner_profile_id: 'someone-else' })]).mockResolvedValueOnce([studentRow]).mockResolvedValue([]);
    const res = await recommend(req(), ctx(PID));
    expect(res.status).toBe(403);
    expect(await res.text()).not.toContain('Asha');
  });
  it('returns 404 when the project does not exist', async () => {
    as('business', BIZ);
    sql.mockResolvedValue([]);
    expect((await recommend(req(), ctx(PID))).status).toBe(404);
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
    sql.mockResolvedValueOnce([projectRow()]).mockResolvedValueOnce([studentRow]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const res = await recommend(req(), ctx(PID));
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).toContain('Lists required skill \\"React\\"');
    expect(text).not.toMatch(/email|asha@example/i);
  });
});

describe('parallel loaders', () => {
  const vec = '[1,0,0]';
  it('maps the portfolio json column onto the student', async () => {
    sql.mockResolvedValueOnce([{ ...studentRow, portfolio: [{ title: 'Cafe', description: 'Menu site', skillsUsed: ['React'] }, { title: 'Blog', description: null, skillsUsed: null }] }]);
    const student = await loadStudentByProfile(STU);
    expect(student?.portfolio).toEqual([{ title: 'Cafe', description: 'Menu site', skillsUsed: ['React'] }, { title: 'Blog', description: null, skillsUsed: [] }]);
    expect(sql).toHaveBeenCalledTimes(1);
  });
  it('defaults to an empty portfolio when the column is missing', async () => {
    sql.mockResolvedValueOnce([studentRow]);
    expect((await loadStudentByProfile(STU))?.portfolio).toEqual([]);
  });
  it('loads a student recommendation page in one parallel round and falls back to lexical without vectors', async () => {
    sql.mockResolvedValueOnce([studentRow]).mockResolvedValueOnce([projectRow()]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const input = await loadStudentRecommendationInput(STU);
    expect(sql).toHaveBeenCalledTimes(4);
    expect(input?.projects.map((p) => p.id)).toEqual([PID]);
    expect(input?.retriever).toBeInstanceOf(LexicalRetriever);
  });
  it('uses embeddings when the query and candidate vectors are stored', async () => {
    sql.mockResolvedValueOnce([studentRow]).mockResolvedValueOnce([projectRow()]).mockResolvedValueOnce([{ id: 's1', v: vec }]).mockResolvedValueOnce([{ id: PID, v: vec }]);
    expect((await loadStudentRecommendationInput(STU))?.retriever).toBeInstanceOf(EmbeddingRetriever);
  });
  it('falls back to lexical when the vector query fails', async () => {
    sql.mockResolvedValueOnce([studentRow]).mockResolvedValueOnce([projectRow()]).mockRejectedValueOnce(new Error('no column')).mockRejectedValueOnce(new Error('no column'));
    expect((await loadStudentRecommendationInput(STU))?.retriever).toBeInstanceOf(LexicalRetriever);
  });
  it('returns null when the student has no profile row', async () => {
    sql.mockResolvedValue([]);
    expect(await loadStudentRecommendationInput(STU)).toBeNull();
  });
  it('blocks a non-owner and returns candidates only to the owner', async () => {
    sql.mockResolvedValueOnce([projectRow({ owner_profile_id: 'someone-else' })]).mockResolvedValueOnce([studentRow]).mockResolvedValue([]);
    expect(await loadProjectRecommendationInput(PID, BIZ)).toEqual({ kind: 'forbidden' });
    sql.mockResolvedValueOnce([projectRow()]).mockResolvedValueOnce([studentRow]).mockResolvedValueOnce([{ id: PID, v: vec }]).mockResolvedValueOnce([{ id: 's1', v: vec }]);
    const ok = await loadProjectRecommendationInput(PID, BIZ);
    expect(ok.kind).toBe('ok');
    if (ok.kind === 'ok') {
      expect(ok.students).toHaveLength(1);
      expect(ok.retriever).toBeInstanceOf(EmbeddingRetriever);
    }
  });
});
