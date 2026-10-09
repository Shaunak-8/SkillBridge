import 'server-only';
import { createNeonAuth } from '@neondatabase/auth/next/server';

export function authConfigured() {
  return Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET);
}
// Seconds the signed session cookie is trusted before Neon Auth is asked again. A 1s value made every server
// render call Neon Auth remotely (server components cannot refresh the cookie). A user banned or signed out
// elsewhere keeps access for at most this long.
const SESSION_DATA_TTL_SECONDS = 60;

let cached: { key: string; auth: ReturnType<typeof createNeonAuth> } | undefined;

export function getAuth() {
  if (!authConfigured()) throw new Error('Neon Auth is not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET.');
  const baseUrl = process.env.NEON_AUTH_BASE_URL!;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET!;
  const key = `${baseUrl}|${secret}`;
  // One client per process: building it on every call repeated its setup for each request.
  if (cached?.key !== key) cached = { key, auth: createNeonAuth({ baseUrl, cookies: { secret, sessionDataTtl: SESSION_DATA_TTL_SECONDS } }) };
  return cached.auth;
}
