import { currentProfile } from '@/lib/auth/profile';
import { apiError, ApiFailure } from '@/lib/api';
export async function GET(_request: Request, context: { params: Promise<{ role: string }> }) {
  const { role } = await context.params;
  if (!['student', 'business', 'admin'].includes(role)) return apiError(new ApiFailure(404, 'NOT_FOUND', 'Not found.'));
  try {
    const current = await currentProfile();
    if (!current) return apiError(new ApiFailure(401, 'UNAUTHENTICATED', 'Sign in required.'));
    if (!current.user.emailVerified || !current.profile?.onboarding_completed || current.profile.role !== role) return apiError(new ApiFailure(403, 'FORBIDDEN', 'Access denied.'));
    // Only the current account's application data is queried by currentProfile().
    return Response.json({ profile: current.profile });
  } catch (error) { return apiError(error); }
}
