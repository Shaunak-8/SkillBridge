import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { getAuth } from '@/lib/auth/server';
it('initializes the installed SDK with the application configuration', () => {
  vi.stubEnv('NEON_AUTH_BASE_URL', 'https://example.neonauth.aws.neon.tech/neondb/auth');
  vi.stubEnv('NEON_AUTH_COOKIE_SECRET', 'test-secret-longer-than-thirty-two-characters');
  expect(() => getAuth()).not.toThrow();
  expect(typeof getAuth().handler().GET).toBe('function');
  expect(typeof getAuth().handler().POST).toBe('function');
  expect(typeof getAuth().middleware({ loginUrl: '/login' })).toBe('function');
  vi.unstubAllEnvs();
});
