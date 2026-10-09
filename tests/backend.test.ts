import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ profile: vi.fn(), sql: vi.fn() }));
vi.mock('@/lib/auth/profile', () => ({ currentProfile: mocks.profile }));
vi.mock('@/lib/db', () => ({ database: () => mocks.sql }));
vi.mock('@/lib/auth/security', () => ({ sameOrigin: () => true }));
import { requireApiIdentity, requireOwnership, apiError } from '@/lib/api';
import { PATCH } from '@/app/api/projects/[id]/route';
import { POST as apply, GET as applications } from '@/app/api/applications/route';
import { canTransition } from '@/lib/projects/lifecycle';

beforeEach(() => { vi.resetAllMocks(); });
describe('Shared backend authorization', () => {
  it('rejects anonymous API access', async () => { mocks.profile.mockResolvedValue(null); await expect(requireApiIdentity()).rejects.toMatchObject({ status: 401 }); });
  it('rejects wrong roles', async () => { mocks.profile.mockResolvedValue({ user: { emailVerified: true }, profile: { role: 'student', onboarding_completed: true } }); await expect(requireApiIdentity('business')).rejects.toMatchObject({ status: 403 }); });
  it('rejects unverified accounts', async () => { mocks.profile.mockResolvedValue({ user: { emailVerified: false }, profile: { role: 'business', onboarding_completed: true } }); await expect(requireApiIdentity()).rejects.toMatchObject({ status: 403 }); });
  it('rejects another owner and accepts the real owner', () => { expect(() => requireOwnership('owner', 'attacker')).toThrow(); expect(() => requireOwnership('owner', 'owner')).not.toThrow(); });
  it('does not expose internal error details', async () => { expect(await apiError(new Error('database secret')).json()).toEqual({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable.' } }); });
  it('blocks project mutation before issuing an update for another owner', async () => {
    mocks.profile.mockResolvedValue({ user: { emailVerified: true }, profile: { id: 'attacker', role: 'business', onboarding_completed: true } });
    mocks.sql.mockResolvedValue([{ owner_profile_id: 'owner', status: 'draft' }]);
    const response = await PATCH(new Request('http://localhost/api/projects/x', { method: 'PATCH', body: JSON.stringify({ action: 'confirm' }) }), { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) });
    expect(response.status).toBe(403); expect(mocks.sql).toHaveBeenCalledTimes(1);
  });
  it('translates database rejection of unconfirmed publishing into a stable error', async () => {
    mocks.profile.mockResolvedValue({ user: { emailVerified: true }, profile: { id: 'owner', role: 'business', onboarding_completed: true } });
    mocks.sql.mockResolvedValueOnce([{ owner_profile_id: 'owner', status: 'draft', brief_version: 1 }]).mockRejectedValueOnce({ code: '23514' });
    const response = await PATCH(new Request('http://localhost/api/projects/x', { method: 'PATCH', body: JSON.stringify({ status: 'published' }) }), { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) });
    expect(response.status).toBe(409); expect((await response.json()).error.code).toBe('PROJECT_NOT_READY');
  });
  it('derives student identity from the session when applying', async () => {
    mocks.profile.mockResolvedValue({ user: { emailVerified: true }, profile: { id: 'real-profile', role: 'student', onboarding_completed: true } });
    mocks.sql.mockResolvedValueOnce([{ id: 'real-student' }]).mockResolvedValueOnce([{ id: 'application', project_id: 'project', student_id: 'real-student', status: 'submitted', cover_note: 'Hello', created_at: '2026-10-09' }]);
    const response = await apply(new Request('http://localhost/api/applications', { method: 'POST', body: JSON.stringify({ projectId: '11111111-1111-4111-8111-111111111111', coverNote: 'Hello', studentId: 'forged' }) }));
    expect(response.status).toBe(201);
    expect(mocks.sql.mock.calls[0].slice(1)).toContain('real-profile');
    expect(mocks.sql.mock.calls[1].slice(1)).toContain('real-student');
    expect(mocks.sql.mock.calls.flat()).not.toContain('forged');
  });
  it('scopes private application reads to the authenticated owner', async () => {
    mocks.profile.mockResolvedValue({ user: { emailVerified: true }, profile: { id: 'owner', role: 'business', onboarding_completed: true } });
    mocks.sql.mockResolvedValue([]);
    expect((await applications()).status).toBe(200);
    expect(mocks.sql.mock.calls[0].slice(1)).toEqual(['owner']);
  });
});
it('enforces project lifecycle transitions', () => { expect(canTransition('draft', 'published')).toBe(true); expect(canTransition('draft', 'completed')).toBe(false); expect(canTransition('completed', 'published')).toBe(false); });
