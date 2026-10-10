import 'server-only';
import { rateLimit, sameOrigin } from '@/lib/auth/security';
import { fail, guard, isUuid, type Profile } from '@/lib/ws5/guard';
import type { Result } from './attempts';

/**
 * Shared prelude of the student quiz routes: same-origin on writes, uuid ids (404), signed-in onboarded STUDENT, per-profile rate limit.
 * Returns the session profile, or a Response to return directly. Identity comes from the session only.
 */
export async function studentPrelude(
  request: Request, ids: string[], write: boolean, bucket: string, limit: number,
): Promise<Profile | Response> {
  if (write && !sameOrigin(request)) return fail('Invalid request origin.', 403);
  if (!ids.every(isUuid)) return fail('Not found.', 404);
  const auth = await guard('student');
  if (auth instanceof Response) return auth;
  if (!await rateLimit(bucket, auth.profile.id, limit)) return fail('Too many attempts. Try again later.', 429);
  return auth.profile;
}

/** Maps a lib result to a response: the payload on success, the `{ error }` shape otherwise. */
export const respond = <T>(result: Result<T>, status = 200) =>
  result.ok ? Response.json(result.data, { status }) : fail(result.error, result.status);
