import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dashboardPath, email, onboardingRole, password, username } from '@/lib/auth/validation';

vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ session: vi.fn(), sql: vi.fn(), configured: vi.fn(() => true), redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }), limiter: vi.fn(() => true) }));
vi.mock('@/lib/auth/server', () => ({ authConfigured: mocks.configured, getAuth: () => ({ getSession: mocks.session }) }));
vi.mock('@/lib/db', () => ({ database: () => mocks.sql }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/lib/auth/security', () => ({ sameOrigin: (r: Request) => r.headers.get('origin') === 'http://localhost:3000', rateLimit: mocks.limiter }));
import { requireRole } from '@/lib/auth/profile';
import { GET, POST } from '@/app/api/profile/route';
import { GET as workspaceGET } from '@/app/api/workspace/[role]/route';

beforeEach(() => { vi.clearAllMocks(); mocks.configured.mockReturnValue(true); mocks.limiter.mockReturnValue(true); mocks.session.mockResolvedValue({ data: { user: { id: 'auth-1', email: 'user@example.com', emailVerified: true } } }); mocks.sql.mockResolvedValue([]); });
describe('Input and redirect security', () => {
  it('normalizes usernames case-insensitively', () => expect(username('Aarav_123')).toBe('aarav_123'));
  it.each(['ab', 'user-name', 'a'.repeat(31), "x'; DROP TABLE users;"])('rejects invalid username %s', value => expect(() => username(value)).toThrow());
  it('validates email', () => { expect(email('USER@example.com')).toBe('user@example.com'); expect(() => email('bad')).toThrow(); });
  it('trims email before validating length and format', () => {
    expect(email(`${' '.repeat(300)}USER@example.com${' '.repeat(300)}`)).toBe('user@example.com');
    expect(() => email(' user @example.com ')).toThrow();
    expect(() => email(`${'a'.repeat(255)}@example.com`)).toThrow();
    expect(() => email(null)).toThrow();
  });
  it.each(['short', 'alllowercase123!', 'ALLUPPERCASE123!', 'NoNumbersHere!', 'NoSymbolsHere123'])('rejects weak password %s', value => expect(() => password(value)).toThrow());
  it('accepts a strong password', () => expect(password('LongPassword123!')).toBe('LongPassword123!'));
  it.each(['admin', 'owner', null])('blocks self-assigned role %s', value => expect(() => onboardingRole(value)).toThrow());
  it('uses only fixed dashboard paths', () => { expect(dashboardPath('admin')).toBe('/admin/dashboard'); expect(dashboardPath('//evil.test')).toBe('/onboarding'); });
});
describe('Server-side role protection', () => {
  it('rejects anonymous page access', async () => { mocks.session.mockResolvedValue({ data: null }); await expect(requireRole('admin')).rejects.toThrow('REDIRECT:/login'); });
  it('blocks unverified email', async () => { mocks.session.mockResolvedValue({ data: { user: { id: 'auth-1', emailVerified: false } } }); await expect(requireRole('student')).rejects.toThrow('REDIRECT:/verify-email'); });
  it('requires onboarding', async () => { await expect(requireRole('student')).rejects.toThrow('REDIRECT:/onboarding'); });
  it('blocks cross-role page access', async () => { mocks.sql.mockResolvedValue([{ role: 'student', onboarding_completed: true }]); await expect(requireRole('admin')).rejects.toThrow('REDIRECT:/student/dashboard'); });
  it('allows correct role', async () => { mocks.sql.mockResolvedValue([{ role: 'business', onboarding_completed: true }]); expect((await requireRole('business')).profile.role).toBe('business'); });
});
const request = (body: object, origin = 'http://localhost:3000') => new Request('http://localhost:3000/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json', origin }, body: JSON.stringify(body) });
describe('Profile endpoint authorization', () => {
  it('rejects anonymous reads and writes', async () => { mocks.session.mockResolvedValue({ data: null }); expect((await GET()).status).toBe(401); expect((await POST(request({}))).status).toBe(401); });
  it('blocks cross-origin requests', async () => { expect((await POST(request({}, 'https://evil.test'))).status).toBe(403); expect(mocks.sql).not.toHaveBeenCalled(); });
  it('blocks admin onboarding', async () => expect((await POST(request({ username: 'aarav', fullName: 'Aarav', role: 'admin' }))).status).toBe(400));
  it('prevents changing completed roles', async () => { mocks.sql.mockResolvedValue([{ role: 'student', onboarding_completed: true }]); const result = await POST(request({ role: 'admin' })); expect(await result.json()).toEqual({ redirect: '/student/dashboard' }); expect(mocks.sql).toHaveBeenCalledTimes(1); });
  it('does not accept a forged account id', async () => { mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([{ role: 'business' }]); const result = await POST(request({ username: 'aarav', fullName: 'Aarav', role: 'business', auth_user_id: 'victim' })); expect(result.status).toBe(200); const values = mocks.sql.mock.calls[1].slice(1); expect(values).toContain('auth-1'); expect(values).not.toContain('victim'); });
  it('reports duplicate usernames', async () => { mocks.sql.mockResolvedValueOnce([]).mockRejectedValueOnce({ code: '23505' }); expect((await POST(request({ username: 'aarav', fullName: 'Aarav', role: 'student' }))).status).toBe(409); });
  it('blocks unverified writes', async () => { mocks.session.mockResolvedValue({ data: { user: { id: 'auth-1', emailVerified: false } } }); expect((await POST(request({}))).status).toBe(403); });
  it('enforces the rate limit', async () => { mocks.limiter.mockReturnValue(false); expect((await POST(request({}))).status).toBe(429); });
});
describe('Role-scoped API authorization', () => {
  const read = (role: string) => workspaceGET(new Request(`http://localhost:3000/api/workspace/${role}`), { params: Promise.resolve({ role }) });
  it('rejects anonymous access', async () => { mocks.session.mockResolvedValue({ data: null }); expect((await read('student')).status).toBe(401); });
  it('rejects unknown roles', async () => expect((await read('owner')).status).toBe(404));
  it('rejects incomplete onboarding', async () => expect((await read('student')).status).toBe(403));
  it.each(['admin', 'business'])('rejects cross-role %s access', async role => { mocks.sql.mockResolvedValue([{ role: 'student', onboarding_completed: true }]); expect((await read(role)).status).toBe(403); });
  it('authorizes the correct role', async () => { mocks.sql.mockResolvedValue([{ role: 'student', onboarding_completed: true }]); expect((await read('student')).status).toBe(200); });
});
