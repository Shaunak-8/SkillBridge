import 'server-only';
import { currentProfile } from '@/lib/auth/profile';
import type { Page } from './repo';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v);
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;

export const fail = (error: string, status: number) => Response.json({ error }, { status });
export const unavailable = () => fail('Something went wrong. Please try again.', 503);

export interface Profile { id: string; role: 'student' | 'business' | 'admin'; onboarding_completed: boolean }

/** Returns the signed-in, onboarded profile, or a Response (401/403) to return directly. */
export async function guard(role?: 'student' | 'business'): Promise<{ profile: Profile } | Response> {
  const current = await currentProfile();
  if (!current) return fail('Sign in required.', 401);
  const profile = current.profile as Profile | null;
  if (!current.user.emailVerified) return fail('Verify your email first.', 403);
  if (!profile?.onboarding_completed) return fail('Complete onboarding first.', 403);
  if (role && profile.role !== role) return fail('Not allowed for your account type.', 403);
  return { profile };
}

const clampInt = (raw: string | null, fallback: number, min: number, max: number) => {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
export function pageParams(url: URL): Page {
  return {
    page: clampInt(url.searchParams.get('page'), 1, 1, 100000),
    pageSize: clampInt(url.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE),
  };
}
