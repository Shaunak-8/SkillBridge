import 'server-only';
import { createNeonAuth } from '@neondatabase/auth/next/server';

export function authConfigured() {
  return Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET);
}
export function getAuth() {
  if (!authConfigured()) throw new Error('Neon Auth is not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET.');
  return createNeonAuth({ baseUrl: process.env.NEON_AUTH_BASE_URL!, cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET!, sessionDataTtl: 1 } });
}
