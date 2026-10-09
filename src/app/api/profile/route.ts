import { currentProfile } from '@/lib/auth/profile';
import { database } from '@/lib/db';
import { dashboardPath, onboardingRole, username } from '@/lib/auth/validation';
import { rateLimit, sameOrigin } from '@/lib/auth/security';
import { apiError, ApiFailure } from '@/lib/api';

export async function GET() {
  const current = await currentProfile();
  if (!current) return apiError(new ApiFailure(401, 'UNAUTHENTICATED', 'Sign in required.'));
  return Response.json({ profile: current.profile });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError(new ApiFailure(403, 'INVALID_ORIGIN', 'Invalid request origin.'));
  try {
    const current = await currentProfile();
    if (!current) return apiError(new ApiFailure(401, 'UNAUTHENTICATED', 'Sign in required.'));
    if (!current.user.emailVerified) return apiError(new ApiFailure(403, 'EMAIL_UNVERIFIED', 'Verify your email before continuing.'));
    if (!await rateLimit('onboarding', current.user.id)) return apiError(new ApiFailure(429, 'RATE_LIMITED', 'Too many attempts. Try again later.'));
    // Completed roles are immutable through every application endpoint.
    if (current.profile?.onboarding_completed) return Response.json({ redirect: dashboardPath(current.profile.role) });
    const body = await request.json();
    const name = username(body.username);
    const role = onboardingRole(body.role);
    if (typeof body.fullName !== 'string' || !body.fullName.trim() || body.fullName.length > 100) return apiError(new ApiFailure(400, 'INVALID_INPUT', 'Enter your full name (up to 100 characters).'));
    // One atomic upsert. A concurrent request cannot overwrite an assigned role.
    const rows = await database()`INSERT INTO skillbridge.profiles (auth_user_id, username, email, full_name, avatar_url, role, onboarding_completed)
      VALUES (${current.user.id}, ${name}, ${current.user.email}, ${body.fullName.trim()}, ${current.user.image ?? null}, ${role}, true)
      ON CONFLICT (auth_user_id) DO UPDATE SET username = EXCLUDED.username, full_name = EXCLUDED.full_name,
        role = EXCLUDED.role, onboarding_completed = true, updated_at = now()
      WHERE NOT skillbridge.profiles.onboarding_completed RETURNING role`;
    const final = rows[0] ?? (await database()`SELECT role FROM skillbridge.profiles WHERE auth_user_id = ${current.user.id}`)[0];
    return Response.json({ redirect: dashboardPath(final.role) });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') return apiError(new ApiFailure(409, 'USERNAME_TAKEN', 'That username is taken. Choose another.'));
    if (error instanceof Error && /^(Use |Choose )/.test(error.message)) return apiError(new ApiFailure(400, 'INVALID_INPUT', error.message));
    if (error instanceof SyntaxError) return apiError(new ApiFailure(400, 'INVALID_INPUT', 'Invalid JSON.'));
    return apiError(error);
  }
}
