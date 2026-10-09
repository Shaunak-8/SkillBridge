import { currentProfile } from '@/lib/auth/profile';
import { database } from '@/lib/db';
import { dashboardPath, onboardingRole, username } from '@/lib/auth/validation';
import { rateLimit, sameOrigin } from '@/lib/auth/security';

export async function GET() {
  const current = await currentProfile();
  if (!current) return Response.json({ error: 'Sign in required.' }, { status: 401 });
  return Response.json({ profile: current.profile });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    const current = await currentProfile();
    if (!current) return Response.json({ error: 'Sign in required.' }, { status: 401 });
    if (!current.user.emailVerified) return Response.json({ error: 'Verify your email before continuing.' }, { status: 403 });
    if (!await rateLimit('onboarding', current.user.id)) return Response.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    // Completed roles are immutable through every application endpoint.
    if (current.profile?.onboarding_completed) return Response.json({ redirect: dashboardPath(current.profile.role) });
    const body = await request.json();
    const name = username(body.username);
    const role = onboardingRole(body.role);
    if (typeof body.fullName !== 'string' || !body.fullName.trim() || body.fullName.length > 100) return Response.json({ error: 'Enter your full name (up to 100 characters).' }, { status: 400 });
    // One atomic upsert. A concurrent request cannot overwrite an assigned role.
    const rows = await database()`INSERT INTO skillbridge.profiles (auth_user_id, username, email, full_name, avatar_url, role, onboarding_completed)
      VALUES (${current.user.id}, ${name}, ${current.user.email}, ${body.fullName.trim()}, ${current.user.image ?? null}, ${role}, true)
      ON CONFLICT (auth_user_id) DO UPDATE SET username = EXCLUDED.username, full_name = EXCLUDED.full_name,
        role = EXCLUDED.role, onboarding_completed = true, updated_at = now()
      WHERE NOT skillbridge.profiles.onboarding_completed RETURNING role`;
    const final = rows[0] ?? (await database()`SELECT role FROM skillbridge.profiles WHERE auth_user_id = ${current.user.id}`)[0];
    return Response.json({ redirect: dashboardPath(final.role) });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') return Response.json({ error: 'That username is taken. Choose another.' }, { status: 409 });
    if (error instanceof Error && /^(Use |Choose )/.test(error.message)) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ error: 'Unable to save your profile. Please try again.' }, { status: 503 });
  }
}
