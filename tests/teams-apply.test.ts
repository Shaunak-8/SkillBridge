import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const current = vi.hoisted(() => vi.fn());
const repo = vi.hoisted(() => ({
  insertApplication: vi.fn(), insertComplexApplication: vi.fn(), loadProject: vi.fn(), studentIdForProfile: vi.fn(),
}));
vi.mock('@/lib/db', () => ({ database: () => vi.fn() }));
vi.mock('@/lib/auth/profile', () => ({ currentProfile: current }));
vi.mock('@/lib/auth/security', () => ({ sameOrigin: () => true, rateLimit: async () => true }));
vi.mock('@/lib/ws5/repo', () => repo);
import { POST as apply } from '@/app/api/projects/[id]/applications/route';

const PID = '11111111-1111-4111-8111-111111111111';
const TEAM = '33333333-3333-4333-8333-333333333333';
const STU = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const post = (body: unknown) => apply(new Request('http://x/api', { method: 'POST', body: JSON.stringify(body) }), { params: Promise.resolve({ id: PID }) });

beforeEach(() => {
  vi.resetAllMocks();
  current.mockResolvedValue({ user: { id: 'u', emailVerified: true }, profile: { id: STU, role: 'student', onboarding_completed: true } });
  repo.studentIdForProfile.mockResolvedValue('student-row');
  repo.loadProject.mockResolvedValue({ id: PID, status: 'published' });
  repo.insertComplexApplication.mockResolvedValue({ id: 'app1' });
  repo.insertApplication.mockResolvedValue({ id: 'app2' });
});

describe('team applications', () => {
  it('passes the team id to the application insert', async () => {
    const response = await post({ cover_note: 'We apply', pitch: 'Team pitch', team_id: TEAM });
    expect(response.status).toBe(201);
    expect(repo.insertComplexApplication).toHaveBeenCalledWith(PID, 'student-row', expect.objectContaining({ pitch: 'Team pitch' }), TEAM);
  });
  it('treats a team application as a full application even with only a cover note', async () => {
    await post({ cover_note: 'Just a note', team_id: TEAM });
    expect(repo.insertComplexApplication).toHaveBeenCalled();
    expect(repo.insertApplication).not.toHaveBeenCalled();
  });
  it('rejects a malformed team id', async () => {
    expect((await post({ cover_note: 'x', team_id: 'nope' })).status).toBe(400);
    expect((await post({ cover_note: 'x', team_id: 42 })).status).toBe(400);
    expect(repo.insertComplexApplication).not.toHaveBeenCalled();
  });
  it('keeps solo applications on the existing path', async () => {
    await post({ cover_note: 'Solo note' });
    expect(repo.insertApplication).toHaveBeenCalledWith(PID, 'student-row', 'Solo note');
    expect(repo.insertComplexApplication).not.toHaveBeenCalled();
  });
  it('explains a team that is too small', async () => {
    repo.insertComplexApplication.mockRejectedValue(new Error('A team needs 2 to 5 members to apply'));
    const response = await post({ cover_note: 'x', team_id: TEAM });
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/at least 2/);
  });
  it('says only the leader can apply', async () => {
    repo.insertComplexApplication.mockRejectedValue(new Error('A team application must come from the team leader'));
    expect((await post({ cover_note: 'x', team_id: TEAM })).status).toBe(403);
  });
  it('reports a team that already applied', async () => {
    repo.insertComplexApplication.mockRejectedValue(Object.assign(new Error('duplicate key'), { code: '23505', constraint: 'applications_team_idx' }));
    const response = await post({ cover_note: 'x', team_id: TEAM });
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/team has already applied/i);
  });
  it('keeps the existing message for a duplicate solo application', async () => {
    repo.insertApplication.mockRejectedValue(Object.assign(new Error('duplicate key'), { code: '23505', constraint: 'applications_project_id_student_id_key' }));
    const response = await post({ cover_note: 'x' });
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe('You have already applied');
  });
  it('blocks a team member from applying on their own', async () => {
    repo.insertApplication.mockRejectedValue(new Error('You are on a team for this project; apply through your team'));
    expect((await post({ cover_note: 'x' })).status).toBe(409);
  });
  it('hides unknown failures', async () => {
    repo.insertComplexApplication.mockRejectedValue(new Error('connection to 10.0.0.1 refused'));
    const response = await post({ cover_note: 'x', team_id: TEAM });
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('10.0.0.1');
  });
});
