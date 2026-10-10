import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ database: vi.fn() }));
import { applicationOrigin, sameOrigin } from '@/lib/auth/security';

beforeEach(() => {
  for (const key of ['APP_URL', 'VERCEL', 'VERCEL_ENV', 'VERCEL_URL', 'VERCEL_BRANCH_URL', 'VERCEL_PROJECT_PRODUCTION_URL']) vi.stubEnv(key, undefined);
});
afterEach(() => vi.unstubAllEnvs());
function request(origin?: string) {
  return new Request('https://internal.example/api/profile', { headers: origin ? { origin } : {} });
}
function vercel(environment = 'production') {
  vi.stubEnv('VERCEL', '1');
  vi.stubEnv('VERCEL_ENV', environment);
  vi.stubEnv('VERCEL_URL', 'app-deployment.vercel.app');
  vi.stubEnv('VERCEL_BRANCH_URL', 'app-branch.vercel.app');
  vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'app.vercel.app');
}
it('retains explicit local HTTPS and the non-Vercel fallback', () => {
  expect(applicationOrigin()).toBe('http://localhost:3000');
  vi.stubEnv('APP_URL', 'https://localhost:3000/');
  expect(applicationOrigin()).toBe('https://localhost:3000');
  expect(sameOrigin(request('https://localhost:3000'))).toBe(true);
});
it.each([undefined, 'http://localhost:3000', 'https://localhost:3000', 'not-a-url'])('uses the production domain when APP_URL is %s', value => {
  vercel(); vi.stubEnv('APP_URL', value);
  expect(applicationOrigin()).toBe('https://app.vercel.app');
  expect(sameOrigin(request('https://app.vercel.app'))).toBe(true);
  expect(sameOrigin(request('http://localhost:3000'))).toBe(false);
});
it('allows the configured custom domain and exact deployment aliases', () => {
  vercel(); vi.stubEnv('APP_URL', 'https://custom.example/');
  expect(applicationOrigin()).toBe('https://custom.example');
  for (const origin of ['https://custom.example', 'https://app-deployment.vercel.app', 'https://app-branch.vercel.app']) expect(sameOrigin(request(origin))).toBe(true);
});
it('does not automatically allow production from a preview', () => {
  vercel('preview');
  expect(applicationOrigin()).toBe('https://app-branch.vercel.app');
  expect(sameOrigin(request('https://app.vercel.app'))).toBe(false);
});
it.each([undefined, 'null', 'https://evil.vercel.app', 'https://app.vercel.app.evil.test', 'http://app.vercel.app'])('rejects untrusted origins: %s', origin => {
  vercel(); expect(sameOrigin(request(origin))).toBe(false);
});
it('never uses a forged Host header as an origin allowlist', () => {
  vercel();
  expect(sameOrigin(new Request('https://evil.vercel.app/api/profile', { headers: { host: 'evil.vercel.app', origin: 'https://evil.vercel.app', 'x-forwarded-host': 'evil.vercel.app' } }))).toBe(false);
});
it('fails closed when deployed without any valid configured domain', () => {
  vi.stubEnv('VERCEL', '1'); vi.stubEnv('APP_URL', 'https://localhost:3000');
  expect(sameOrigin(request('https://localhost:3000'))).toBe(false);
  expect(() => applicationOrigin()).toThrow('Configure APP_URL');
});
