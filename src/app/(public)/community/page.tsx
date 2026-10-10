import { redirect } from 'next/navigation';
import { currentProfile } from '@/lib/auth/profile';

export const dynamic = 'force-dynamic';

// Community lives inside each role's workspace (/student/community, /business/community).
// This public entry point, which the navbar links to, sends each person to the right one.
export default async function CommunityEntry() {
  const role = (await currentProfile())?.profile?.role;
  if (role === 'student') redirect('/student/community');
  if (role === 'business') redirect('/business/community');
  redirect('/login');
}
