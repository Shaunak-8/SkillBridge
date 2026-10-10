import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { database } from '@/lib/db';
import { authConfigured, getAuth } from './server';
import { dashboardPath } from './validation';
import type { Role } from '@/types';

export const sessionUser = cache(async () => {
  if (!authConfigured()) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await getAuth().getSession();
    if (!error) return data?.user ?? null;
    if (error.status === 401) return null;
    if (error.status < 500) break;
  }
  throw new Error('Authentication is temporarily unavailable. Please retry.');
});
export const currentProfile = cache(async () => {
  const user = await sessionUser();
  if (!user) return null;
  const rows = await database()`SELECT * FROM skillbridge.profiles WHERE auth_user_id = ${user.id}`;
  return { user, profile: rows[0] ?? null };
});
export async function requireRole(role: Role) {
  const current = await currentProfile();
  if (!current) redirect('/login');
  if (!current.user.emailVerified) redirect('/verify-email');
  if (!current.profile?.onboarding_completed) redirect('/onboarding');
  if (current.profile.role !== role) redirect(dashboardPath(current.profile.role));
  return current;
}
