import 'server-only';
import { currentProfile } from '@/lib/auth/profile';
import type { Role } from '@/types';
import type { ApiError } from '@/types/backend';

export class ApiFailure extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export async function requireApiIdentity(role?: Role) {
  const current = await currentProfile();
  if (!current) throw new ApiFailure(401, 'UNAUTHENTICATED', 'Sign in required.');
  if (!current.user.emailVerified || !current.profile?.onboarding_completed)
    throw new ApiFailure(403, 'ONBOARDING_REQUIRED', 'Verify your email and complete onboarding.');
  if (role && current.profile.role !== role) throw new ApiFailure(403, 'FORBIDDEN', 'Access denied.');
  return current;
}
export function requireOwnership(ownerId: string, profileId: string) {
  if (ownerId !== profileId) throw new ApiFailure(403, 'FORBIDDEN', 'Access denied.');
}
export function apiError(error: unknown) {
  const failure = error instanceof ApiFailure ? error : new ApiFailure(503, 'SERVICE_UNAVAILABLE', 'Service temporarily unavailable.');
  return Response.json({ error: { code: failure.code, message: failure.message } } satisfies ApiError, { status: failure.status });
}
