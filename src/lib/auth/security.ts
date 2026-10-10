import 'server-only';
import { createHash } from 'node:crypto';
import { database } from '@/lib/db';

function configuredOrigins() {
  const deployed = process.env.VERCEL === '1' && process.env.VERCEL_ENV !== 'development';
  const candidates = [process.env.APP_URL];
  if (deployed) {
    // These are server-provided deployment names, never browser Host headers.
    // The production URL also exists in previews; don't implicitly trust it there.
    for (const host of [
      process.env.VERCEL_ENV === 'production' ? process.env.VERCEL_PROJECT_PRODUCTION_URL : undefined,
      process.env.VERCEL_BRANCH_URL,
      process.env.VERCEL_URL,
    ]) if (host) candidates.push(`https://${host}`);
  } else if (!process.env.APP_URL) candidates.push('http://localhost:3000');
  return candidates.flatMap(value => {
    if (!value) return [];
    try {
      const url = new URL(value);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return [];
      if (deployed && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) return [];
      return [url.origin];
    } catch { return []; }
  });
}
export function applicationOrigin() {
  const origin = configuredOrigins()[0];
  if (!origin) throw new Error('Configure APP_URL with the public HTTPS application origin.');
  return origin;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return origin !== null && configuredOrigins().includes(origin);
}
// Shared, atomic Postgres limiter. Never trust client-supplied IP headers.
export async function rateLimit(bucket: string, identity: string, limit = 10) {
  const key = createHash('sha256').update(`${bucket}:${identity}`).digest('hex');
  const rows = await database()`INSERT INTO skillbridge.rate_limits (key, hits, expires_at)
    VALUES (${key}, 1, now() + interval '10 minutes')
    ON CONFLICT (key) DO UPDATE SET
      hits = CASE WHEN skillbridge.rate_limits.expires_at < now() THEN 1 ELSE skillbridge.rate_limits.hits + 1 END,
      expires_at = CASE WHEN skillbridge.rate_limits.expires_at < now() THEN now() + interval '10 minutes' ELSE skillbridge.rate_limits.expires_at END
    RETURNING hits`;
  return rows[0].hits <= limit;
}

// Successful password checks should not consume the failed-attempt allowance.
// Keep other attempts (including concurrent failures) and the global limit.
export async function releaseSuccessfulLogin(identity: string) {
  const key = createHash('sha256').update(`sign-in/email:${identity}`).digest('hex');
  await database()`UPDATE skillbridge.rate_limits SET hits = GREATEST(hits - 1, 0)
    WHERE key = ${key} AND expires_at > now()`;
}
