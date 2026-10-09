import 'server-only';
import { createHash } from 'node:crypto';
import { database } from '@/lib/db';

export function sameOrigin(request: Request) {
  const expected = new URL(process.env.APP_URL || 'http://localhost:3000').origin;
  return request.headers.get('origin') === expected;
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
