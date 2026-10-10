import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const current = vi.hoisted(() => vi.fn());
const security = vi.hoisted(() => ({ sameOrigin: vi.fn(() => true), rateLimit: vi.fn(async () => true) }));
const repo = vi.hoisted(() => ({
  createTeam: vi.fn(), loadTeam: vi.fn(), inviteStudent: vi.fn(), cancelInvite: vi.fn(), respondToInvite: vi.fn(),
  searchInvitableStudents: vi.fn(),
}));
vi.mock('@/lib/db', () => ({ database: () => vi.fn() }));
vi.mock('@/lib/auth/profile', () => ({ currentProfile: current }));
vi.mock('@/lib/auth/security', () => security);
vi.mock('@/lib/teams/repo', () => repo);
import { POST as createTeam } from '@/app/api/projects/[id]/teams/route';
import { GET as candidates } from '@/app/api/projects/[id]/teams/candidates/route';
import { GET as getTeam } from '@/app/api/teams/[id]/route';
import { POST as invite } from '@/app/api/teams/[id]/invites/route';
import { DELETE as cancel } from '@/app/api/teams/[id]/invites/[membershipId]/route';
import { POST as respond } from '@/app/api/team-invites/[id]/respond/route';

const ID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const STU = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const as = (role: string) => current.mockResolvedValue({ user: { id: 'u', emailVerified: true }, profile: { id: STU, role, onboarding_completed: true } });
const req = (body?: unknown, url = 'http://x/api') => new Request(url, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const ctxInvite = (id: string, membershipId: string) => ({ params: Promise.resolve({ id, membershipId }) });

beforeEach(() => {
  vi.resetAllMocks();
  security.sameOrigin.mockReturnValue(true);
  security.rateLimit.mockResolvedValue(true);
  as('student');
});

const ROUTES = {
  'create team': () => createTeam(req({ name: 'Pixel Pioneers' }), ctx(ID)),
  'search teammates': () => candidates(new Request('http://x/api?q=as'), ctx(ID)),
  'view team': () => getTeam(new Request('http://x/api'), ctx(ID)),
  'invite': () => invite(req({ studentId: OTHER }), ctx(ID)),
  'cancel invite': () => cancel(req(), ctxInvite(ID, OTHER)),
  'respond to invite': () => respond(req({ accept: true }), ctx(ID)),
};

describe.each(Object.entries(ROUTES))('%s: access control', (_name, call) => {
  it('requires a signed-in user', async () => {
    current.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
  });
  it('is for students only', async () => {
    as('business');
    expect((await call()).status).toBe(403);
  });
});

describe('writes reject a foreign origin and non-uuid ids', () => {
  it('rejects a cross-origin request', async () => {
    security.sameOrigin.mockReturnValue(false);
    expect((await ROUTES['create team']()).status).toBe(403);
    expect((await ROUTES['invite']()).status).toBe(403);
    expect((await ROUTES['respond to invite']()).status).toBe(403);
    expect((await ROUTES['cancel invite']()).status).toBe(403);
    expect(repo.createTeam).not.toHaveBeenCalled();
  });
  it('returns 404 for a malformed id', async () => {
    expect((await createTeam(req({ name: 'Pixel Pioneers' }), ctx('nope'))).status).toBe(404);
    expect((await invite(req({ studentId: OTHER }), ctx('nope'))).status).toBe(404);
    expect((await respond(req({ accept: true }), ctx('nope'))).status).toBe(404);
    expect((await cancel(req(), ctxInvite(ID, 'nope'))).status).toBe(404);
  });
});

describe('create team', () => {
  it('validates the name', async () => {
    expect((await createTeam(req({ name: 'x' }), ctx(ID))).status).toBe(400);
    expect((await createTeam(req({}), ctx(ID))).status).toBe(400);
    expect((await createTeam(new Request('http://x', { method: 'POST', body: 'not json' }), ctx(ID))).status).toBe(400);
  });
  it('creates the team and returns it', async () => {
    repo.createTeam.mockResolvedValue(OTHER);
    repo.loadTeam.mockResolvedValue({ id: OTHER, name: 'Pixel Pioneers' });
    const response = await createTeam(req({ name: ' Pixel Pioneers ', description: 'hi' }), ctx(ID));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ team: { id: OTHER, name: 'Pixel Pioneers' } });
    expect(repo.createTeam).toHaveBeenCalledWith(STU, ID, 'Pixel Pioneers', 'hi');
  });
  it('maps a duplicate name to a friendly 409 without leaking details', async () => {
    repo.createTeam.mockRejectedValue(Object.assign(new Error('duplicate key value violates unique constraint "x" on host 10.0.0.1'), { constraint: 'teams_project_name_idx' }));
    const response = await createTeam(req({ name: 'Pixel Pioneers' }), ctx(ID));
    expect(response.status).toBe(409);
    expect(JSON.stringify(await response.json())).not.toContain('10.0.0.1');
  });
  it('is rate limited', async () => {
    security.rateLimit.mockResolvedValue(false);
    expect((await createTeam(req({ name: 'Pixel Pioneers' }), ctx(ID))).status).toBe(429);
  });
  it('reports a team that was created but cannot be loaded instead of returning null', async () => {
    repo.createTeam.mockResolvedValue(OTHER);
    repo.loadTeam.mockResolvedValue(null);
    const response = await createTeam(req({ name: 'Pixel Pioneers' }), ctx(ID));
    expect(response.status).toBe(500);
    expect((await response.json()).error).toMatch(/Refresh/);
  });
});

describe('invite', () => {
  it('validates the student id', async () => {
    expect((await invite(req({ studentId: 'nope' }), ctx(ID))).status).toBe(400);
  });
  it('creates an invitation', async () => {
    repo.inviteStudent.mockResolvedValue('m1');
    const response = await invite(req({ studentId: OTHER }), ctx(ID));
    expect(response.status).toBe(201);
    expect(repo.inviteStudent).toHaveBeenCalledWith(STU, ID, OTHER);
  });
  it('explains when the student cannot be invited', async () => {
    repo.inviteStudent.mockResolvedValue(null);
    const response = await invite(req({ studentId: OTHER }), ctx(ID));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/cannot be invited/i);
  });
  it('maps a full team to a friendly 409', async () => {
    repo.inviteStudent.mockRejectedValue(new Error('The team is full'));
    const response = await invite(req({ studentId: OTHER }), ctx(ID));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/full/);
  });
  it('is rate limited', async () => {
    security.rateLimit.mockResolvedValue(false);
    expect((await invite(req({ studentId: OTHER }), ctx(ID))).status).toBe(429);
  });
});

describe('cancel and respond', () => {
  it('cancels a pending invitation, or reports it is gone', async () => {
    repo.cancelInvite.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await cancel(req(), ctxInvite(ID, OTHER))).status).toBe(200);
    expect((await cancel(req(), ctxInvite(ID, OTHER))).status).toBe(404);
    expect(repo.cancelInvite).toHaveBeenCalledWith(STU, ID, OTHER);
  });
  it('validates the answer', async () => {
    expect((await respond(req({ accept: 'maybe' }), ctx(ID))).status).toBe(400);
  });
  it('accepts or declines an open invitation', async () => {
    repo.respondToInvite.mockResolvedValue({ teamId: OTHER, projectId: ID });
    const response = await respond(req({ accept: true }), ctx(ID));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ teamId: OTHER, projectId: ID });
    expect(repo.respondToInvite).toHaveBeenCalledWith(STU, ID, true);
  });
  it('returns 404 when there is no open invitation', async () => {
    repo.respondToInvite.mockResolvedValue(null);
    expect((await respond(req({ accept: false }), ctx(ID))).status).toBe(404);
  });
  it('maps rule violations such as joining a second team to a conflict', async () => {
    repo.respondToInvite.mockRejectedValue(Object.assign(new Error('duplicate key'), { constraint: 'team_members_one_active_per_project_idx' }));
    expect((await respond(req({ accept: true }), ctx(ID))).status).toBe(409);
  });
});

describe('search and view', () => {
  it('requires 2 to 60 characters', async () => {
    expect((await candidates(new Request('http://x/api?q=a'), ctx(ID))).status).toBe(400);
    expect((await candidates(new Request('http://x/api'), ctx(ID))).status).toBe(400);
    expect((await candidates(new Request(`http://x/api?q=${'x'.repeat(61)}`), ctx(ID))).status).toBe(400);
  });
  it('returns candidates', async () => {
    repo.searchInvitableStudents.mockResolvedValue([{ id: OTHER, name: 'Asha', skills: ['React'] }]);
    const response = await candidates(new Request('http://x/api?q=as'), ctx(ID));
    expect(await response.json()).toEqual({ students: [{ id: OTHER, name: 'Asha', skills: ['React'] }] });
    expect(repo.searchInvitableStudents).toHaveBeenCalledWith(STU, ID, 'as');
  });
  it('rate limits the roster read generously', async () => {
    security.rateLimit.mockResolvedValue(false);
    expect((await getTeam(new Request('http://x/api'), ctx(ID))).status).toBe(429);
    expect(security.rateLimit).toHaveBeenCalledWith('team-view', STU, 300);
  });
  it('hides a team from non-members', async () => {
    repo.loadTeam.mockResolvedValue(null);
    expect((await getTeam(new Request('http://x/api'), ctx(ID))).status).toBe(404);
  });
  it('shows the team to a member', async () => {
    repo.loadTeam.mockResolvedValue({ id: ID, name: 'Pixel Pioneers' });
    const response = await getTeam(new Request('http://x/api'), ctx(ID));
    expect(response.headers.get('cache-control')).toMatch(/no-store/);
    expect(await response.json()).toEqual({ team: { id: ID, name: 'Pixel Pioneers' } });
  });
});
