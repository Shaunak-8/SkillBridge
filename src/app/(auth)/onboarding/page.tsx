import { redirect } from 'next/navigation';
import { currentProfile } from '@/lib/auth/profile';
import { dashboardPath } from '@/lib/auth/validation';
import { OnboardingForm } from '@/components/auth/OnboardingForm';
import { AccountControls } from '@/components/auth/AccountControls';
export const dynamic = 'force-dynamic';
export default async function OnboardingPage() {
  const current = await currentProfile();
  if (!current) redirect('/login');
  if (!current.user.emailVerified) redirect('/verify-email');
  if (current.profile?.onboarding_completed) redirect(dashboardPath(current.profile.role));
  return <><OnboardingForm name={current.profile?.username ?? current.user.name} /><div className="fixed right-4 top-4"><AccountControls /></div></>;
}
