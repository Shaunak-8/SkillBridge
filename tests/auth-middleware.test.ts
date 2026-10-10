import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ get: vi.fn(), middleware: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ authConfigured: () => true, getAuth: () => ({
  handler: () => ({ GET: mocks.get }), middleware: () => mocks.middleware,
}) }));
vi.mock('@/lib/auth/security', () => ({ applicationOrigin: () => 'http://localhost:3000' }));
import proxy from '@/proxy';
const token = '__Secure-neon-auth.session_token';
const cacheCookie = '__Secure-neon-auth.local.session_data';
const request = (path = '/student/dashboard', cookie = `${token}=opaque`) => new NextRequest(`http://localhost:3000${path}`, { headers: { cookie } });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.middleware.mockImplementation((req: NextRequest) => NextResponse.next({ request: { headers: req.headers } }));
});
it('does not turn an upstream outage into a login redirect or clear cookies', async () => {
  mocks.get.mockImplementation(() => Promise.resolve(Response.json({}, { status: 503 })));
  const result = await proxy(request());
  expect(result.status).toBe(503);
  expect(result.headers.has('location')).toBe(false);
  expect(result.headers.has('set-cookie')).toBe(false);
  expect(mocks.middleware).not.toHaveBeenCalled();
  expect(mocks.get).toHaveBeenCalledTimes(2);
});
it('forwards refreshed session cookies to the render and browser', async () => {
  mocks.get.mockResolvedValue(Response.json({ user: { id: 'user' } }, { headers: {
    'Set-Cookie': `${cacheCookie}=fresh; HttpOnly; Secure; Path=/; Max-Age=60`,
  } }));
  const result = await proxy(request());
  expect(result.headers.get('set-cookie')).toContain(`${cacheCookie}=fresh`);
  expect(result.headers.get('x-middleware-request-cookie')).toContain(`${cacheCookie}=fresh`);
  expect(result.headers.get('cache-control')).toBe('private, no-store');
});
it('keeps OAuth verifier processing in the official SDK', async () => {
  await proxy(request('/auth/continue?neon_auth_session_verifier=opaque'));
  expect(mocks.get).not.toHaveBeenCalled();
  expect(mocks.middleware).toHaveBeenCalledOnce();
});
it('keeps anonymous route protection in the official SDK', async () => {
  mocks.middleware.mockResolvedValue(NextResponse.redirect('http://localhost:3000/login'));
  expect((await proxy(request('/student/dashboard', ''))).status).toBe(307);
  expect(mocks.get).not.toHaveBeenCalled();
});
it('keeps public login accessible', async () => {
  expect((await proxy(request('/login', ''))).status).toBe(200);
  expect(mocks.middleware).not.toHaveBeenCalled();
});
it('treats an explicitly invalid session as unauthenticated rather than an outage', async () => {
  mocks.get.mockResolvedValue(Response.json(null, { status: 401 }));
  mocks.middleware.mockResolvedValue(NextResponse.redirect('http://localhost:3000/login'));
  const result = await proxy(request());
  expect(result.status).toBe(307);
  expect(result.headers.get('location')).toBe('http://localhost:3000/login');
  expect(mocks.get).toHaveBeenCalledOnce();
});
it('canonicalizes local auth links without weakening origin checks', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  try {
    const result = await proxy(new NextRequest('http://127.0.0.1:3000/login', { headers: { host: '127.0.0.1:3000' } }));
    expect(result.headers.get('location')).toBe('http://localhost:3000/login');
  } finally { vi.unstubAllEnvs(); }
});
