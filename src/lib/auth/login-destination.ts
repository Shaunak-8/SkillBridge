import { dashboardPath } from './validation';

// Read the cookie-backed session, not the sign-in response or SDK memory cache.
// A successful password check alone does not prove the browser saved the cookie.
export async function loginDestination(expectedUserId: string) {
  const sessionResponse = await fetch('/api/auth/get-session', { credentials: 'same-origin', cache: 'no-store' });
  if (!sessionResponse.ok) throw new Error('Unable to confirm your session. Please try signing in again.');
  const session = await sessionResponse.json();
  if (!session?.user?.id || session.user.id !== expectedUserId) {
    throw new Error('Your browser did not save the login session. Allow cookies for this site and open it using HTTPS, then try again.');
  }
  if (!session.user.emailVerified) return '/verify-email';
  const profileResponse = await fetch('/api/profile', { credentials: 'same-origin', cache: 'no-store' });
  if (!profileResponse.ok) throw new Error('You are signed in, but your profile could not be loaded. Please retry.');
  const { profile } = await profileResponse.json();
  // A new OAuth/signup account still needs the idempotent profile setup step.
  if (!profile) return '/auth/continue';
  return profile.onboarding_completed ? dashboardPath(profile.role) : '/onboarding';
}
