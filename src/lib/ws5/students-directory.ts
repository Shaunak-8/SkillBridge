import 'server-only';
import { database } from '@/lib/db';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export const DIRECTORY_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;
const MAX_TEXT = 100;
const MAX_HOURS = 80;
const BIO_MAX = 240;

export interface DirectoryParams { q: string | null; skill: string | null; minHours: number | null; page: number }
export interface DirectoryStudent {
  id: string; displayName: string; bio: string | null; skills: string[]; interests: string[]; preferredCategories: string[];
  availabilityHoursPerWeek: number | null; remotePreference: string | null; portfolio: { title: string; skillsUsed: string[] }[];
}
export interface DirectoryPage { items: DirectoryStudent[]; total: number; page: number; pageSize: number }
export interface DirectoryQuery { q?: string | null; skill?: string | null; minHours?: number | null; page?: number; pageSize?: number }

type SearchParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim().slice(0, MAX_TEXT) || null;

/** Untrusted URL query to safe filters: text capped at 100 chars, minHours 0..80 (null when absent or not a number), page >= 1. */
export function parseDirectoryParams(sp: SearchParams): DirectoryParams {
  const hours = Number.parseInt(one(sp.minHours) ?? '', 10);
  const page = Number.parseInt(one(sp.page) ?? '', 10);
  return {
    q: one(sp.q), skill: one(sp.skill),
    minHours: Number.isFinite(hours) ? Math.min(MAX_HOURS, Math.max(0, hours)) : null,
    page: Number.isFinite(page) ? Math.max(1, page) : 1,
  };
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.trunc(n)));

/** Row to the public-safe card shape. Only whitelisted fields are copied, so nothing else can leak through. */
export function toDirectoryStudent(r: Row): DirectoryStudent {
  const bio = typeof r.bio === 'string' && r.bio.trim() ? r.bio.trim() : null;
  return {
    id: r.id, displayName: r.full_name?.trim() || 'Student',
    bio: bio && bio.length > BIO_MAX ? `${bio.slice(0, BIO_MAX).trimEnd()}…` : bio,
    skills: r.skills ?? [], interests: r.interests ?? [], preferredCategories: r.preferred_categories ?? [],
    availabilityHoursPerWeek: r.availability_hours_per_week ?? null, remotePreference: r.remote_preference ?? null,
    portfolio: Array.isArray(r.portfolio) ? r.portfolio.slice(0, 3).map((i: Row) => ({ title: String(i.title ?? ''), skillsUsed: i.skillsUsed ?? [] })) : [],
  };
}

/** Students who opted in (visibility public or matching). Selects no email, username or auth ids. */
export async function searchStudents(f: DirectoryQuery = {}): Promise<DirectoryPage> {
  const pageSize = clamp(f.pageSize ?? DIRECTORY_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const page = Math.max(1, Math.trunc(f.page ?? 1) || 1);
  const q = f.q?.trim().slice(0, MAX_TEXT) || null;
  const skill = f.skill?.trim().slice(0, MAX_TEXT) || null;
  const minHours = f.minHours == null || !Number.isFinite(f.minHours) ? null : clamp(f.minHours, 0, MAX_HOURS);
  const pattern = q ? `%${escapeLike(q)}%` : null;

  const rows = await database()`SELECT sp.id, pr.full_name, left(sp.bio, ${BIO_MAX + 1}) AS bio, sp.skills, sp.interests, sp.preferred_categories,
      sp.availability_hours_per_week, sp.remote_preference,
      COALESCE((SELECT json_agg(json_build_object('title', t.title, 'skillsUsed', t.skills_used) ORDER BY t.created_at DESC)
        FROM (SELECT i.title, i.skills_used, i.created_at FROM skillbridge.student_portfolio_items i
          WHERE i.student_id = sp.id ORDER BY i.created_at DESC LIMIT 3) t), '[]'::json) AS portfolio,
      count(*) OVER() AS total
    FROM skillbridge.student_profiles sp
    JOIN skillbridge.profiles pr ON pr.id = sp.profile_id
    WHERE sp.visibility IN ('public', 'matching')
      -- Only people who actually signed up: demo and seeded profiles have no Neon Auth login.
      AND EXISTS (SELECT 1 FROM neon_auth."user" u WHERE u.id::text = pr.auth_user_id)
      AND (${pattern}::text IS NULL OR sp.bio ILIKE ${pattern}
        OR EXISTS (SELECT 1 FROM unnest(sp.skills) s WHERE s ILIKE ${pattern})
        OR EXISTS (SELECT 1 FROM unnest(sp.interests) s WHERE s ILIKE ${pattern})
        OR EXISTS (SELECT 1 FROM skillbridge.student_portfolio_items pi WHERE pi.student_id = sp.id AND pi.title ILIKE ${pattern}))
      AND (${skill}::text IS NULL OR EXISTS (SELECT 1 FROM unnest(sp.skills) s WHERE lower(s) = lower(${skill})))
      AND (${minHours}::int IS NULL OR sp.availability_hours_per_week >= ${minHours})
    ORDER BY sp.updated_at DESC, sp.id
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
  return { items: rows.map(toDirectoryStudent), total: rows.length ? Number(rows[0].total) : 0, page, pageSize };
}
