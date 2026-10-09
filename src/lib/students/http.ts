import 'server-only';
import { ApiFailure, requireApiIdentity } from '@/lib/api';
import { rateLimit, sameOrigin } from '@/lib/auth/security';

const MUTATIONS_PER_WINDOW = 30;

/** Signed-in student for reads. Ownership comes only from the returned profile id. */
export const studentIdentity = () => requireApiIdentity('student');

/** Same-origin, rate-limited, signed-in student for writes. */
export async function studentMutationIdentity(request: Request) {
  if (!sameOrigin(request)) throw new ApiFailure(403, 'BAD_ORIGIN', 'Invalid request origin.');
  const current = await requireApiIdentity('student');
  if (!(await rateLimit('student-profile', current.profile.id, MUTATIONS_PER_WINDOW)))
    throw new ApiFailure(429, 'RATE_LIMITED', 'Too many requests. Try again shortly.');
  return current;
}

export async function readJson(request: Request): Promise<object> {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiFailure(400, 'BAD_REQUEST', 'Invalid JSON request payload.');
  return body;
}

export const validationFailed = (details: Record<string, string>) =>
  Response.json({ error: { code: 'VALIDATION_FAILED', message: 'Validation failed.', details } }, { status: 400 });
