import 'server-only';
import { database } from '@/lib/db';
import type { MatchPortfolioItem, MatchProject, MatchStudent } from '@/lib/matching/types';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const MAX_POOL = 300; // ponytail: in-memory ranking pool; move retrieval into SQL/pgvector past this.

export interface DiscoverFilters { q: string | null; category: string | null; skill: string | null; remote: boolean | null }
export interface Page { page: number; pageSize: number }

export function toProject(r: Row): MatchProject {
  return {
    id: r.id, title: r.title, summary: r.summary, problemStatement: r.problem_statement, category: r.category,
    requiredSkills: r.required_skills ?? [], remoteOk: r.remote_ok, locationText: r.location_text, status: r.status,
  };
}

function toStudent(r: Row, portfolio: MatchPortfolioItem[]): MatchStudent {
  return {
    id: r.id, displayName: r.full_name ?? 'Student', bio: r.bio, skills: r.skills ?? [], interests: r.interests ?? [],
    preferredCategories: r.preferred_categories ?? [], availabilityHoursPerWeek: r.availability_hours_per_week,
    remotePreference: r.remote_preference, visibility: r.visibility, portfolio,
  };
}

/** Public-safe candidate view: no email, username or auth ids. */
export function candidateDto(s: MatchStudent) {
  return {
    id: s.id, displayName: s.displayName, bio: s.bio, skills: s.skills, interests: s.interests,
    availabilityHoursPerWeek: s.availabilityHoursPerWeek,
    portfolio: s.portfolio.map((i) => ({ title: i.title, skillsUsed: i.skillsUsed })),
  };
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function discoverProjects(f: DiscoverFilters, { page, pageSize }: Page) {
  const pattern = f.q ? `%${escapeLike(f.q)}%` : null;
  const rows = await database()`SELECT id, title, summary, category, required_skills, remote_ok, location_text, timeline, compensation, published_at,
      count(*) OVER() AS total
    FROM skillbridge.projects
    WHERE status = 'published'
      AND (${pattern}::text IS NULL OR title ILIKE ${pattern} OR summary ILIKE ${pattern} OR problem_statement ILIKE ${pattern})
      AND (${f.category}::text IS NULL OR lower(category) = lower(${f.category}))
      AND (${f.skill}::text IS NULL OR EXISTS (SELECT 1 FROM unnest(required_skills) s WHERE lower(s) = lower(${f.skill})))
      AND (${f.remote}::boolean IS NULL OR remote_ok = ${f.remote})
    ORDER BY published_at DESC NULLS LAST, id
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
  const items = rows.map(({ total: _t, ...r }: Row) => r);
  return { items, total: rows.length ? Number(rows[0].total) : 0, page, pageSize };
}

export async function loadProject(id: string): Promise<(MatchProject & { ownerProfileId: string }) | null> {
  const rows = await database()`SELECT id, title, summary, problem_statement, category, required_skills, remote_ok, location_text, status, owner_profile_id FROM skillbridge.projects WHERE id = ${id}`;
  return rows[0] ? { ...toProject(rows[0]), ownerProfileId: rows[0].owner_profile_id } : null;
}

export async function loadPublishedProjects(): Promise<MatchProject[]> {
  const rows = await database()`SELECT id, title, summary, problem_statement, category, required_skills, remote_ok, location_text, status FROM skillbridge.projects WHERE status = 'published'
    ORDER BY published_at DESC NULLS LAST LIMIT ${MAX_POOL}`;
  return rows.map(toProject);
}

async function loadPortfolios(studentIds: string[]): Promise<Map<string, MatchPortfolioItem[]>> {
  const map = new Map<string, MatchPortfolioItem[]>();
  if (!studentIds.length) return map;
  const rows = await database()`SELECT student_id, title, description, skills_used FROM skillbridge.student_portfolio_items
    WHERE student_id = ANY(${studentIds}::uuid[]) ORDER BY created_at`;
  for (const r of rows) {
    const list = map.get(r.student_id) ?? [];
    list.push({ title: r.title, description: r.description, skillsUsed: r.skills_used ?? [] });
    map.set(r.student_id, list);
  }
  return map;
}

async function withPortfolios(rows: Row[]): Promise<MatchStudent[]> {
  const portfolios = await loadPortfolios(rows.map((r) => r.id));
  return rows.map((r) => toStudent(r, portfolios.get(r.id) ?? []));
}

/** Only students who opted in to matching (public or matching visibility). */
export async function loadRecommendableStudents(): Promise<MatchStudent[]> {
  const rows = await database()`SELECT sp.id, pr.full_name, sp.bio, sp.skills, sp.interests, sp.preferred_categories,
      sp.availability_hours_per_week, sp.remote_preference, sp.visibility FROM skillbridge.student_profiles sp
    JOIN skillbridge.profiles pr ON pr.id = sp.profile_id
    WHERE sp.visibility IN ('public', 'matching') ORDER BY sp.updated_at DESC LIMIT ${MAX_POOL}`;
  return withPortfolios(rows);
}

export async function studentIdForProfile(profileId: string): Promise<string | null> {
  const rows = await database()`SELECT id FROM skillbridge.student_profiles WHERE profile_id = ${profileId}`;
  return rows[0]?.id ?? null;
}

export async function loadStudentByProfile(profileId: string): Promise<MatchStudent | null> {
  const rows = await database()`SELECT sp.id, pr.full_name, sp.bio, sp.skills, sp.interests, sp.preferred_categories,
      sp.availability_hours_per_week, sp.remote_preference, sp.visibility FROM skillbridge.student_profiles sp
    JOIN skillbridge.profiles pr ON pr.id = sp.profile_id WHERE sp.profile_id = ${profileId}`;
  return (await withPortfolios(rows))[0] ?? null;
}

/** Inserts only if the project is still published. Returns null when it is not. */
export async function insertApplication(projectId: string, studentId: string, coverNote: string) {
  const rows = await database()`INSERT INTO skillbridge.applications (project_id, student_id, cover_note)
    SELECT ${projectId}, ${studentId}, ${coverNote}
    WHERE EXISTS (SELECT 1 FROM skillbridge.projects WHERE id = ${projectId} AND status = 'published')
    RETURNING id, project_id, status, cover_note, created_at`;
  return rows[0] ?? null;
}

export async function listProjectApplications(projectId: string, { page, pageSize }: Page) {
  const rows = await database()`SELECT a.id AS application_id, a.status AS application_status, a.cover_note, a.created_at,
      sp.id, pr.full_name, sp.bio, sp.skills, sp.interests, sp.preferred_categories,
      sp.availability_hours_per_week, sp.remote_preference, sp.visibility, count(*) OVER() AS total
    FROM skillbridge.applications a
    JOIN skillbridge.student_profiles sp ON sp.id = a.student_id
    JOIN skillbridge.profiles pr ON pr.id = sp.profile_id
    WHERE a.project_id = ${projectId}
    ORDER BY a.created_at DESC, a.id LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
  const students = await withPortfolios(rows);
  const items = rows.map((r: Row, i: number) => ({
    id: r.application_id, status: r.application_status, coverNote: r.cover_note, createdAt: r.created_at, student: students[i],
  }));
  return { items, total: rows.length ? Number(rows[0].total) : 0, page, pageSize };
}

export async function listStudentApplications(studentId: string, { page, pageSize }: Page) {
  const rows = await database()`SELECT a.id, a.status, a.cover_note, a.created_at, a.updated_at, p.id AS project_id,
      p.title AS project_title, p.category AS project_category, p.status AS project_status, count(*) OVER() AS total
    FROM skillbridge.applications a JOIN skillbridge.projects p ON p.id = a.project_id
    WHERE a.student_id = ${studentId}
    ORDER BY a.created_at DESC, a.id LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
  const items = rows.map(({ total: _t, ...r }: Row) => r);
  return { items, total: rows.length ? Number(rows[0].total) : 0, page, pageSize };
}

export async function loadApplicationForStatus(id: string) {
  const rows = await database()`SELECT a.id, a.status, p.owner_profile_id, sp.profile_id AS student_profile_id
    FROM skillbridge.applications a
    JOIN skillbridge.projects p ON p.id = a.project_id
    JOIN skillbridge.student_profiles sp ON sp.id = a.student_id WHERE a.id = ${id}`;
  return rows[0] ?? null;
}

/** Compare-and-set on the current status so concurrent updates cannot both win. */
export async function updateApplicationStatus(id: string, from: string, to: string) {
  const rows = await database()`UPDATE skillbridge.applications SET status = ${to}, updated_at = now()
    WHERE id = ${id} AND status = ${from} RETURNING id, status, updated_at`;
  return rows[0] ?? null;
}
