import { AuthForm } from '@/components/auth/AuthForm';
import { redirect } from 'next/navigation';
import { currentProfile } from '@/lib/auth/profile';
import { dashboardPath } from '@/lib/auth/validation';
export const dynamic = 'force-dynamic';
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ oauthError?: string; verified?: string }> }) {
  const { oauthError, verified } = await searchParams;
  const current = await currentProfile();
  if (current) {
    if (!current.user.emailVerified) redirect('/verify-email');
    if (!current.profile) redirect('/auth/continue');
    redirect(current.profile.onboarding_completed ? dashboardPath(current.profile.role) : '/onboarding');
  }
  return <>{oauthError && <p role="alert" className="bg-red-50 p-4 text-center text-red-700">Google sign-in did not finish. Please try again.</p>}{verified === '1' && <p role="status" className="bg-green-50 p-4 text-center text-green-800">Email verified. Sign in to open your workspace.</p>}<AuthForm mode="login" /></>;
}
