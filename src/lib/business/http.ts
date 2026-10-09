import 'server-only';
import { z } from 'zod';
import { currentProfile } from '@/lib/auth/profile';
import { sameOrigin, rateLimit } from '@/lib/auth/security';

export class BusinessError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export async function businessIdentity() {
  const current = await currentProfile();
  if (!current) throw new BusinessError(401, 'SIGN_IN_REQUIRED', 'Please sign in to continue.');
  if (!current.user.emailVerified || !current.profile?.onboarding_completed || current.profile.role !== 'business') {
    throw new BusinessError(403, 'BUSINESS_REQUIRED', 'A verified business account is required.');
  }
  return String(current.profile.id);
}
export async function jsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const raw = await request.text();
  if (raw.length > 64000) throw new BusinessError(413, 'INPUT_TOO_LARGE', 'Please shorten your submission.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new BusinessError(400, 'INVALID_JSON', 'Please send valid form data.'); }
  return schema.parse(value);
}
export function projectId(id: string) {
  if (!z.uuid().safeParse(id).success) throw new BusinessError(404, 'NOT_FOUND', 'This project could not be found.');
  return id;
}
export async function businessApi(request: Request, run: (owner: string) => Promise<unknown>) {
  try {
    if (request.method !== 'GET' && !sameOrigin(request)) throw new BusinessError(403, 'INVALID_ORIGIN', 'Please use this website to save changes.');
    const owner = await businessIdentity();
    if (request.method !== 'GET' && !await rateLimit('business-write', owner, 60)) throw new BusinessError(429, 'RATE_LIMITED', 'Please wait a moment before trying again.');
    return Response.json({ data: await run(owner) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fields = Object.fromEntries(error.issues.map(issue => [issue.path.join('.'), issue.message]));
      return Response.json({ error: { code: 'INVALID_INPUT', message: 'Please check the highlighted fields.', fields } }, { status: 400 });
    }
    if (error instanceof BusinessError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    // Do not log submitted problem text, account data, or database error details.
    return Response.json({ error: { code: 'UNAVAILABLE', message: 'We could not save or load your information. Please try again.' } }, { status: 503 });
  }
}
