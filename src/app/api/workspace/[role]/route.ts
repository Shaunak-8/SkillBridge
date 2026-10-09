import { currentProfile } from '@/lib/auth/profile';
export async function GET(_request: Request, context: { params: Promise<{ role: string }> }) {
  const { role } = await context.params;
  if (!['student', 'business', 'admin'].includes(role)) return Response.json({ error: 'Not found.' }, { status: 404 });
  try {
    const current = await currentProfile();
    if (!current) return Response.json({ error: 'Sign in required.' }, { status: 401 });
    if (!current.user.emailVerified || !current.profile?.onboarding_completed || current.profile.role !== role) return Response.json({ error: 'Access denied.' }, { status: 403 });
    // Only the current account's application data is queried by currentProfile().
    return Response.json({ profile: current.profile });
  } catch { return Response.json({ error: 'Service temporarily unavailable.' }, { status: 503 }); }
}
