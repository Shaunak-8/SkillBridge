import 'server-only';
import { rateLimit, sameOrigin } from '@/lib/auth/security';
import { fail, guard, isUuid } from '@/lib/ws5/guard';
import { teamErrorResponse } from './errors';

export const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export function teamFail(error: unknown) {
  const { status, message } = teamErrorResponse(error);
  return fail(message, status);
}

interface RouteOptions { ids?: string[]; write?: boolean; limit?: { bucket: string; max: number } }

/**
 * Common preamble of the student team routes: same-origin check for writes, uuid ids, a signed-in onboarded
 * student, and a per-account rate limit. Returns the student's profile id, or a Response to return as is.
 */
export async function studentRoute(request: Request, options: RouteOptions = {}): Promise<string | Response> {
  if (options.write && !sameOrigin(request)) return fail('Invalid request origin.', 403);
  if (options.ids?.some(id => !isUuid(id))) return fail('Not found.', 404);
  const auth = await guard('student');
  if (auth instanceof Response) return auth;
  if (options.limit && !await rateLimit(options.limit.bucket, auth.profile.id, options.limit.max)) {
    return fail('Too many attempts. Try again later.', 429);
  }
  return auth.profile.id;
}
