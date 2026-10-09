import { redirect } from 'next/navigation';
import { currentProfile, sessionUser } from '@/lib/auth/profile';
import { ensureProfile } from '@/lib/auth/ensure-profile';
import { dashboardPath } from '@/lib/auth/validation';
export const dynamic = 'force-dynamic';
export default async function ContinuePage() {
  const user = await sessionUser();
  if (!user) redirect('/login');
  await ensureProfile(user);
  const current = await currentProfile();
  if (!current) redirect('/login');
  if (!current.user.emailVerified) redirect('/verify-email');
  redirect(current.profile?.onboarding_completed ? dashboardPath(current.profile.role) : '/onboarding');
}
