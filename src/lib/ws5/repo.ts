import 'server-only';
import { database } from '@/lib/db';
import { EmbeddingRetriever, LexicalRetriever, type Retriever } from '@/lib/matching/retriever';
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

/** `portfolio` arrives as a json column (already parsed by the neon driver) built in the same query as the student. */
function toPortfolio(raw: unknown): MatchPortfolioItem[] {
  return Array.isArray(raw)
    ? raw.map((i: Row) => ({ title: i.title, description: i.description, skillsUsed: i.skillsUsed ?? [] }))
    : [];
}

function toStudent(r: Row): MatchStudent {
  return {
    id: r.id, displayName: r.full_name ?? 'Student', bio: r.bio, skills: r.skills ?? [], interests: r.interests ?? [],
    preferredCategories: r.preferred_categories ?? [], availabilityHoursPerWeek: r.availability_hours_per_week,
    remotePreference: r.remote_preference, visibility: r.visibility, portfolio: toPortfolio(r.portfolio),
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
  const items = rows.map((r: Row) => { const item = { ...r }; delete item.total; return item; });
  return { items, total: rows.length ? Number(rows[0].total) : 0, page, pageSize };
}

export async function loadProject(id: string): Promise<(MatchProject & { ownerProfileId: string }) | null> {
  const rows = await database()`SELECT id, title, summary, problem_statement, category, required_skills, remote_ok, location_text, status, owner_profile_id FROM skillbridge.projects WHERE id = ${id}`;
  return rows[0] ? { ...toProject(rows[0]), ownerProfileId: rows[0].owner_profile_id } : null;
}

export async function loadPublishedProjects(): Promise<MatchProject[]> {
  const rows = await database()`SELECT id, title, summary, problem_statement, category, required_skills, remote_ok, location_text, status FROM skillbridge.projects WHERE status = 'published'
    ORDER BY published_at DESC NULLS LAST, id LIMIT ${MAX_POOL}`;
  return rows.map(toProject);
}

/** Only students who opted in to matching (public or matching visibility). */
export async function loadRecommendableStudents(): Promise<MatchStudent[]> {
  const rows = await database()`SELECT sp.id, pr.full_name, sp.bio, sp.skills, sp.interests, sp.preferred_categories,
      sp.availability_hours_per_week, sp.remote_preference, sp.visibility,
      COALESCE((SELECT json_agg(json_build_object('title', i.title, 'description', i.description, 'skillsUsed', i.skills_used) ORDER BY i.created_at)
        FROM skillbridge.student_portfolio_items i WHERE i.student_id = sp.id), '[]'::json) AS portfolio
    FROM skillbridge.student_profiles sp
    JOIN skillbridge.profiles pr ON pr.id = sp.profile_id
    WHERE sp.visibility IN ('public', 'matching') ORDER BY sp.updated_at DESC, sp.id LIMIT ${MAX_POOL}`;
  return rows.map(toStudent);
}

/** pgvector text form '[0.1,0.2]' to numbers. Null if malformed. */
function parseVector(text: unknown): number[] | null {
  if (typeof text !== 'string') return null;
  try {
    const v: unknown = JSON.parse(text);
    return Array.isArray(v) && v.every((x) => typeof x === 'number') ? v : null;
  } catch { return null; }
}

/**
 * Stored vectors only (never a live embedding call per request). A row is used only while its
 * embedding is at least as new as the row and its portfolio items (`embedded_at >= updated_at`). Vectors stay inside the
 * retriever and never reach a response. Any failure (e.g. migration 004 not applied) means lexical.
 * These loaders need no candidate ids, so they run in the same round trip as the entity queries.
 */
async function vectorsOf(run: () => Promise<Row[]>): Promise<Map<string, number[]>> {
  const map = new Map<string, number[]>();
  try {
    for (const r of (await run()) ?? []) {
      const v = parseVector(r.v);
      if (v) map.set(r.id, v);
    }
  } catch { /* lexical fallback */ }
  return map;
}

/** Fresh vectors of the same pool `loadPublishedProjects` returns. */
export const loadFreshProjectVectors = () => vectorsOf(() => database()`SELECT id, embedding::text AS v FROM
    (SELECT id, embedding, embedded_at, updated_at FROM skillbridge.projects WHERE status = 'published'
      ORDER BY published_at DESC NULLS LAST, id LIMIT ${MAX_POOL}) p
  WHERE embedding IS NOT NULL AND embedded_at >= updated_at`);

/** Fresh vectors of the `loadRecommendableStudents` pool plus the project's 50 most recent applicants. */
export const loadFreshStudentVectors = (projectId: string) => vectorsOf(() => database()`SELECT id, embedding::text AS v FROM skillbridge.student_profiles
  WHERE embedding IS NOT NULL AND embedded_at >= updated_at
    AND NOT EXISTS (SELECT 1 FROM skillbridge.student_portfolio_items i WHERE i.student_id = student_profiles.id AND i.updated_at > student_profiles.embedded_at)
    AND (id IN (SELECT id FROM skillbridge.student_profiles WHERE visibility IN ('public', 'matching') ORDER BY updated_at DESC, id LIMIT ${MAX_POOL})
      OR id IN (SELECT student_id FROM skillbridge.applications WHERE project_id = ${projectId} ORDER BY created_at DESC, id LIMIT 50))`);

const firstVector = (m: Map<string, number[]>) => m.values().next().value ?? null;

export const loadProjectVector = (projectId: string) => vectorsOf(() => database()`SELECT id, embedding::text AS v FROM skillbridge.projects
  WHERE id = ${projectId} AND embedding IS NOT NULL AND embedded_at >= updated_at`).then(firstVector);

export const loadStudentVectorByProfile = (profileId: string) => vectorsOf(() => database()`SELECT id, embedding::text AS v FROM skillbridge.student_profiles
  WHERE profile_id = ${profileId} AND embedding IS NOT NULL AND embedded_at >= updated_at
    AND NOT EXISTS (SELECT 1 FROM skillbridge.student_portfolio_items i WHERE i.student_id = student_profiles.id AND i.updated_at > student_profiles.embedded_at)`).then(firstVector);

/** Embeddings when the query and at least one candidate have fresh vectors, lexical otherwise. */
export function pickRetriever(query: number[] | null, vectors: Map<string, number[]>): Retriever {
  return query && vectors.size ? new EmbeddingRetriever(query, vectors) : new LexicalRetriever();
}

/** One parallel round trip for the student's recommendations page/route. Null when the student has no profile row. */
export async function loadStudentRecommendationInput(profileId: string) {
  const [student, projects, queryVector, vectors] = await Promise.all([
    loadStudentByProfile(profileId), loadPublishedProjects(), loadStudentVectorByProfile(profileId), loadFreshProjectVectors(),
  ]);
  return student ? { student, projects, retriever: pickRetriever(queryVector, vectors) } : null;
}

export type ProjectRecommendationInput =
  | { kind: 'notFound' }
  | { kind: 'forbidden' }
  | { kind: 'ok'; project: MatchProject & { ownerProfileId: string }; students: MatchStudent[]; retriever: Retriever };

/**
 * One parallel round trip for a project owner's candidate list. The owner check runs on the project row
 * before anything is returned; candidate data fetched for a non-owner is discarded.
 */
export async function loadProjectRecommendationInput(projectId: string, ownerProfileId: string): Promise<ProjectRecommendationInput> {
  const [project, students, queryVector, vectors] = await Promise.all([
    loadProject(projectId), loadRecommendableStudents(), loadProjectVector(projectId), loadFreshStudentVectors(projectId),
  ]);
  if (!project) return { kind: 'notFound' };
  if (project.ownerProfileId !== ownerProfileId) return { kind: 'forbidden' };
  return { kind: 'ok', project, students, retriever: pickRetriever(queryVector, vectors) };
}

export async function studentIdForProfile(profileId: string): Promise<string | null> {
  const rows = await database()`SELECT id FROM skillbridge.student_profiles WHERE profile_id = ${profileId}`;
  return rows[0]?.id ?? null;
}

export async function loadStudentByProfile(profileId: string): Promise<MatchStudent | null> {
  const rows = await database()`SELECT sp.id, pr.full_name, sp.bio, sp.skills, sp.interests, sp.preferred_categories,
      sp.availability_hours_per_week, sp.remote_preference, sp.visibility,
      COALESCE((SELECT json_agg(json_build_object('title', i.title, 'description', i.description, 'skillsUsed', i.skills_used) ORDER BY i.created_at)
        FROM skillbridge.student_portfolio_items i WHERE i.student_id = sp.id), '[]'::json) AS portfolio
    FROM skillbridge.student_profiles sp
    JOIN skillbridge.profiles pr ON pr.id = sp.profile_id WHERE sp.profile_id = ${profileId}`;
  return rows[0] ? toStudent(rows[0]) : null;
}

/** Inserts only if the project is still published. Returns null when it is not. */
export async function insertApplication(projectId: string, studentId: string, coverNote: string) {
  const rows = await database()`INSERT INTO skillbridge.applications (project_id, student_id, cover_note)
    SELECT ${projectId}, ${studentId}, ${coverNote}
    WHERE EXISTS (SELECT 1 FROM skillbridge.projects WHERE id = ${projectId} AND status = 'published')
    RETURNING id, project_id, status, cover_note, created_at`;
  return rows[0] ?? null;
}

export interface ApplicationInput {
  cover_note: string;
  resume_id?: string;
  pitch?: string;
  availability_hours?: number;
  available_from?: Date;
  portfolio_item_ids?: string[];
  answers?: { question_id: string; answer_text: string }[];
}

import { randomUUID } from 'node:crypto';

export async function insertComplexApplication(projectId: string, studentId: string, input: ApplicationInput) {
  const sql = database();
  const id = randomUUID();
  const queries = [];

  queries.push(
    sql`INSERT INTO skillbridge.applications (id, project_id, student_id, cover_note, resume_id, pitch, availability_hours, available_from)
      SELECT ${id}, ${projectId}, ${studentId}, ${input.cover_note}, ${input.resume_id ?? null}, ${input.pitch ?? null}, ${input.availability_hours ?? null}, ${input.available_from ?? null}
      WHERE EXISTS (SELECT 1 FROM skillbridge.projects WHERE id = ${projectId} AND status = 'published')`
  );

  if (input.portfolio_item_ids && input.portfolio_item_ids.length > 0) {
    queries.push(
      sql`INSERT INTO skillbridge.application_portfolio_items(application_id, portfolio_item_id)
          SELECT ${id}, id FROM skillbridge.student_portfolio_items
          WHERE student_id = ${studentId} AND id = ANY(${input.portfolio_item_ids}::uuid[])`
    );
  }

  if (input.answers && input.answers.length > 0) {
    const qIds = input.answers.map(a => a.question_id);
    const qTexts = input.answers.map(a => a.answer_text);
    queries.push(
      sql`INSERT INTO skillbridge.application_answers(application_id, question_id, answer_text)
          SELECT ${id}, q, t FROM unnest(${qIds}::uuid[], ${qTexts}::text[]) AS a(q, t)`
    );
  }

  await sql.transaction(queries);
  
  const appRows = await sql`SELECT * FROM skillbridge.applications WHERE id = ${id}`;
  return appRows[0] ?? null;
}

export async function listProjectApplications(projectId: string, { page, pageSize }: Page) {
  const rows = await database()`SELECT a.id AS application_id, a.status AS application_status, a.cover_note, a.created_at,
      sp.id, pr.full_name, sp.bio, sp.skills, sp.interests, sp.preferred_categories,
      sp.availability_hours_per_week, sp.remote_preference, sp.visibility, count(*) OVER() AS total,
      COALESCE((SELECT json_agg(json_build_object('title', i.title, 'description', i.description, 'skillsUsed', i.skills_used) ORDER BY i.created_at)
        FROM skillbridge.student_portfolio_items i WHERE i.student_id = sp.id), '[]'::json) AS portfolio
    FROM skillbridge.applications a
    JOIN skillbridge.student_profiles sp ON sp.id = a.student_id
    JOIN skillbridge.profiles pr ON pr.id = sp.profile_id
    WHERE a.project_id = ${projectId}
    ORDER BY a.created_at DESC, a.id LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
  const items = rows.map((r: Row) => ({
    id: r.application_id, status: r.application_status, coverNote: r.cover_note, createdAt: r.created_at, student: toStudent(r),
  }));
  return { items, total: rows.length ? Number(rows[0].total) : 0, page, pageSize };
}

export async function listStudentApplications(studentId: string, { page, pageSize }: Page) {
  const rows = await database()`SELECT a.id, a.status, a.cover_note, a.created_at, a.updated_at, p.id AS project_id,
      p.title AS project_title, p.category AS project_category, p.status AS project_status, count(*) OVER() AS total
    FROM skillbridge.applications a JOIN skillbridge.projects p ON p.id = a.project_id
    WHERE a.student_id = ${studentId}
    ORDER BY a.created_at DESC, a.id LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
  const items = rows.map((r: Row) => { const item = { ...r }; delete item.total; return item; });
  return { items, total: rows.length ? Number(rows[0].total) : 0, page, pageSize };
}

/** Same as `listStudentApplications` but resolves the student row inside the query (saves a round trip). */
export async function listApplicationsForProfile(profileId: string, { page, pageSize }: Page) {
  const rows = await database()`SELECT a.id, a.status, a.cover_note, a.created_at, a.updated_at, p.id AS project_id,
      p.title AS project_title, p.category AS project_category, p.status AS project_status, count(*) OVER() AS total
    FROM skillbridge.applications a JOIN skillbridge.projects p ON p.id = a.project_id
    JOIN skillbridge.student_profiles sp ON sp.id = a.student_id
    WHERE sp.profile_id = ${profileId}
    ORDER BY a.created_at DESC, a.id LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
  const items = rows.map((row: Row) => { const item = { ...row }; delete item.total; return item; });
  return { items, total: rows.length ? Number(rows[0].total) : 0, page, pageSize };
}

export async function loadApplicationForStatus(id: string) {
  const rows = await database()`SELECT a.id, a.status, p.owner_profile_id, sp.profile_id AS student_profile_id
    FROM skillbridge.applications a
    JOIN skillbridge.projects p ON p.id = a.project_id
    JOIN skillbridge.student_profiles sp ON sp.id = a.student_id WHERE a.id = ${id}`;
  return rows[0] ?? null;
}

export async function loadApplicationDetail(id: string) {
  const rows = await database()`
    SELECT a.*, p.title AS project_title, p.owner_profile_id, p.required_skills,
           sp.id AS student_id, pr.full_name, sp.bio, sp.skills, sp.education_level, sp.study_year, sp.location_text,
           r.file_url AS resume_url, r.file_name AS resume_name,
           COALESCE((SELECT json_agg(json_build_object('id', i.id, 'title', i.title, 'description', i.description, 'skillsUsed', i.skills_used, 'projectUrl', i.project_url))
             FROM skillbridge.application_portfolio_items api JOIN skillbridge.student_portfolio_items i ON i.id = api.portfolio_item_id WHERE api.application_id = a.id), '[]'::json) AS portfolio,
           COALESCE((SELECT json_agg(json_build_object('question_id', aa.question_id, 'answer_text', aa.answer_text, 'question', q.question))
             FROM skillbridge.application_answers aa JOIN skillbridge.project_questions q ON q.id = aa.question_id WHERE aa.application_id = a.id), '[]'::json) AS answers
    FROM skillbridge.applications a
    JOIN skillbridge.projects p ON p.id = a.project_id
    JOIN skillbridge.student_profiles sp ON sp.id = a.student_id
    JOIN skillbridge.profiles pr ON pr.id = sp.profile_id
    LEFT JOIN skillbridge.resumes r ON r.id = a.resume_id
    WHERE a.id = ${id}`;
  return rows[0] ?? null;
}

/** Compare-and-set on the current status so concurrent updates cannot both win. */
export async function updateApplicationStatus(id: string, from: string, to: string) {
  const rows = await database()`UPDATE skillbridge.applications SET status = ${to}, updated_at = now()
    WHERE id = ${id} AND status = ${from} RETURNING id, status, updated_at`;
  return rows[0] ?? null;
}
