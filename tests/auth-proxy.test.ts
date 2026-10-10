import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ configured: vi.fn(() => true), sql: vi.fn(), rate: vi.fn(), post: vi.fn(), get: vi.fn(), profile: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ authConfigured: mocks.configured, getAuth: () => ({ handler: () => ({ POST: mocks.post, GET: mocks.get }) }) }));
vi.mock('@/lib/db', () => ({ database: () => mocks.sql }));
vi.mock('@/lib/auth/security', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/auth/security')>(), rateLimit: mocks.rate }));
vi.mock('@/lib/auth/ensure-profile', () => ({ ensureProfile: mocks.profile }));
import { GET, POST } from '@/app/api/auth/[...path]/route';
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('APP_URL', 'http://localhost:3000'); mocks.configured.mockReturnValue(true); mocks.rate.mockResolvedValue(true); mocks.sql.mockResolvedValue([]); mocks.post.mockResolvedValue(Response.json({ user: { id: 'verified-upstream-id', name: 'aarav', email: 'a@example.com' } }, { headers: { 'set-cookie': 'session=opaque; HttpOnly' } })); });
const context = (path: string) => ({ params: Promise.resolve({ path: path.split('/') }) });
afterEach(() => vi.unstubAllEnvs());
const req = (path: string, body?: object) => new NextRequest(`http://localhost:3000/api/auth/${path}`, { method: 'POST', headers: { origin: 'http://localhost:3000', 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
it('fails clearly when Auth is not configured', async () => { mocks.configured.mockReturnValue(false); expect((await POST(req('sign-in/email'), context('sign-in/email'))).status).toBe(503); });
it('forwards bodyless logout and preserves cookie clearing headers', async () => { const result = await POST(req('sign-out'), context('sign-out')); expect(result.status).toBe(200); expect(result.headers.get('set-cookie')).toContain('HttpOnly'); expect(mocks.rate).not.toHaveBeenCalled(); });
it('blocks management APIs on GET and POST', async () => { expect((await GET(req('admin/list-users'), context('admin/list-users'))).status).toBe(404); expect((await POST(req('admin/set-role'), context('admin/set-role'))).status).toBe(404); });
it('rejects weak signup passwords before forwarding', async () => { expect((await POST(req('sign-up/email', { email: 'a@example.com', name: 'aarav', password: 'short' }), context('sign-up/email'))).status).toBe(400); expect(mocks.post).not.toHaveBeenCalled(); });
it('rejects duplicate usernames case-insensitively', async () => { mocks.sql.mockResolvedValue([{ id: 'existing' }]); expect((await POST(req('sign-up/email', { email: 'a@example.com', name: 'AARAV', password: 'LongPassword123!' }), context('sign-up/email'))).status).toBe(409); expect(mocks.sql.mock.calls[0].slice(1)).toContain('aarav'); });
it('creates a profile only from the upstream identity', async () => { const result = await POST(req('sign-up/email', { email: 'a@example.com', name: 'aarav', password: 'LongPassword123!', auth_user_id: 'forged' }), context('sign-up/email')); expect(result.status).toBe(200); expect(mocks.profile).toHaveBeenCalledWith(expect.objectContaining({ id: 'verified-upstream-id' })); });
it('does not reveal whether a login account exists', async () => { mocks.post.mockResolvedValue(Response.json({ message: 'User not found' }, { status: 400 })); const result = await POST(req('sign-in/email', { email: 'a@example.com', password: 'bad' }), context('sign-in/email')); expect(result.status).toBe(401); expect(JSON.stringify(await result.json())).not.toContain('not found'); });
it('releases only the successful login attempt without resetting other failures', async () => {
  const result = await POST(req('sign-in/email', { email: 'a@example.com', password: 'valid-password' }), context('sign-in/email'));
  expect(result.status).toBe(200);
  expect(mocks.sql).toHaveBeenCalledOnce();
  expect(mocks.sql.mock.calls[0][0].join('')).toContain('GREATEST(hits - 1, 0)');
  expect(result.headers.get('set-cookie')).toContain('HttpOnly');
});
it('does not refund a failed login attempt', async () => {
  mocks.post.mockResolvedValue(Response.json({}, { status: 401 }));
  await POST(req('sign-in/email', { email: 'a@example.com', password: 'wrong' }), context('sign-in/email'));
  expect(mocks.sql).not.toHaveBeenCalled();
});
it('retains login cookies if the limiter refund fails', async () => {
  mocks.sql.mockRejectedValue(new Error('storage unavailable'));
  const result = await POST(req('sign-in/email', { email: 'a@example.com', password: 'valid-password' }), context('sign-in/email'));
  expect(result.status).toBe(200);
  expect(result.headers.get('set-cookie')).toContain('HttpOnly');
});
it('clears stale unverified cache after successful email verification', async () => {
  const result = await POST(req('email-otp/verify-email', { email: 'a@example.com', otp: '123456' }), context('email-otp/verify-email'));
  expect(result.status).toBe(200);
  expect(result.headers.getSetCookie()).toContain('__Secure-neon-auth.local.session_data=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  expect(result.headers.getSetCookie()).toContain('session=opaque; HttpOnly');
});
it.each(['sign-in/email', 'sign-up/email'])('preserves upstream rate limits on %s', async path => {
  mocks.post.mockResolvedValue(Response.json({}, { status: 429, headers: { 'Retry-After': '45' } }));
  const result = await POST(req(path, { email: 'a@example.com', name: 'aarav', password: 'LongPassword123!' }), context(path));
  expect(result.status).toBe(429);
  expect(result.headers.get('retry-after')).toBe('45');
});
it('reports an upstream outage without blaming login credentials', async () => {
  mocks.post.mockResolvedValue(Response.json({}, { status: 502 }));
  const result = await POST(req('sign-in/email', { email: 'a@example.com', password: 'bad' }), context('sign-in/email'));
  expect(result.status).toBe(503);
  expect((await result.json()).message).toContain('temporarily unavailable');
  expect(mocks.post).toHaveBeenCalledTimes(1);
});
it('retains successful signup cookies when profile storage is temporarily down', async () => {
  mocks.profile.mockRejectedValue(new Error('database unavailable'));
  const result = await POST(req('sign-up/email', { email: 'a@example.com', name: 'aarav', password: 'LongPassword123!' }), context('sign-up/email'));
  expect(result.status).toBe(200);
  expect(result.headers.get('set-cookie')).toContain('HttpOnly');
});
it('retries a transient session read and prevents caching', async () => {
  mocks.get.mockResolvedValueOnce(Response.json({}, { status: 502 })).mockResolvedValueOnce(Response.json({ user: { id: 'auth-1' } }));
  const result = await GET(req('get-session'), context('get-session'));
  expect(result.status).toBe(200);
  expect(result.headers.get('cache-control')).toBe('private, no-store');
  expect(mocks.get).toHaveBeenCalledTimes(2);
});
it('reports persistent session failures as service unavailable, not anonymous', async () => {
  mocks.get.mockRejectedValue(new Error('network failure'));
  expect((await GET(req('get-session'), context('get-session'))).status).toBe(503);
  expect(mocks.get).toHaveBeenCalledTimes(2);
});
it('does not reveal whether a recovery account exists', async () => { mocks.post.mockResolvedValue(Response.json({ message: 'User not found' }, { status: 400 })); expect((await POST(req('request-password-reset', { email: 'a@example.com' }), context('request-password-reset'))).status).toBe(200); });
it('rejects cross-origin redirects', async () => expect((await POST(req('sign-in/social', { provider: 'google', callbackURL: 'https://evil.example/path' }), context('sign-in/social'))).status).toBe(400));
it.each([['/auth/continue', 200], ['https://preview.vercel.app/auth/continue', 200], ['https://production.example/auth/continue', 400]])('validates preview callback %s against the current allowed origin', async (callbackURL, status) => {
  vi.stubEnv('APP_URL', 'https://production.example');
  vi.stubEnv('VERCEL', '1');
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('VERCEL_URL', 'preview.vercel.app');
  const request = new NextRequest('https://preview.vercel.app/api/auth/sign-in/social', {
    method: 'POST', headers: { origin: 'https://preview.vercel.app', 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'google', callbackURL }),
  });
  expect((await POST(request, context('sign-in/social'))).status).toBe(status);
});
it('enforces server-side reset password policy', async () => expect((await POST(req('reset-password', { newPassword: 'short', token: 'fake' }), context('reset-password'))).status).toBe(400));
it('rejects invalid JSON', async () => { const request = new NextRequest('http://localhost:3000/api/auth/sign-out', { method: 'POST', headers: { origin: 'http://localhost:3000' }, body: 'invalid json' }); expect((await POST(request, context('sign-out'))).status).toBe(400); });
it('enforces the shared rate limiter', async () => { mocks.rate.mockResolvedValue(false); expect((await POST(req('sign-in/social', { provider: 'google' }), context('sign-in/social'))).status).toBe(429); });
it.each([false, true])('limits username probes before querying availability (global allowed: %s)', async globalAllowed => {
  mocks.rate.mockResolvedValueOnce(globalAllowed).mockResolvedValueOnce(false);
  const result = await POST(req('sign-up/email', { email: 'a@example.com', name: 'aarav', password: 'LongPassword123!' }), context('sign-up/email'));
  expect(result.status).toBe(429);
  expect(mocks.sql).not.toHaveBeenCalled();
  expect(mocks.post).not.toHaveBeenCalled();
});
it('uses the localhost fallback for relative redirects when APP_URL is unset', async () => {
  vi.stubEnv('APP_URL', undefined);
  expect((await POST(req('sign-in/social', { provider: 'google', callbackURL: '/auth/continue' }), context('sign-in/social'))).status).toBe(200);
});
it('rejects cross-origin redirects with the localhost fallback', async () => {
  vi.stubEnv('APP_URL', undefined);
  expect((await POST(req('sign-in/social', { provider: 'google', callbackURL: 'https://evil.example' }), context('sign-in/social'))).status).toBe(400);
});
it.each(['callbackURL', 'newUserCallbackURL', 'errorCallbackURL', 'redirectTo'])('rejects non-string %s values', async key => {
  for (const value of [null, false, 0, {}, []]) {
    expect((await POST(req('sign-in/social', { provider: 'google', [key]: value }), context('sign-in/social'))).status).toBe(400);
  }
  expect(mocks.post).not.toHaveBeenCalled();
});
it.each(['sign-up/email', 'sign-in/email', 'request-password-reset'])('normalizes email for rate limiting and forwarding on %s', async path => {
  const response = await POST(req(path, { email: '  USER@Example.com  ', name: 'aarav', password: 'LongPassword123!' }), context(path));
  expect(response.status).toBe(200);
  expect(mocks.rate).toHaveBeenCalledWith(path, 'user@example.com', 10);
  const forwarded = mocks.post.mock.calls[0][0] as NextRequest;
  expect((await forwarded.json()).email).toBe('user@example.com');
  expect(forwarded.headers.get('origin')).toBe('http://localhost:3000');
  expect(forwarded.method).toBe('POST');
  expect(forwarded.url).toBe(req(path).url);
});
