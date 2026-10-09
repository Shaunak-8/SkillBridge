import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { database } from '@/lib/db';
import { authConfigured, getAuth } from './server';
import { dashboardPath } from './validation';
import type { Role } from '@/types';

// cache() dedupes within one server render, so a layout and its page share a single session check and profile query.
export const sessionUser = cache(async () => {
  if (!authConfigured()) return null;
  const { data, error } = await getAuth().getSession();
  if (error) return null;
  return data?.user ?? null;
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
