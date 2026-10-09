import 'server-only';
import { randomUUID } from 'node:crypto';
import { database } from '@/lib/db';
import { BusinessError } from './http';
import type { BusinessInput, BusinessProfile, BusinessProject, BriefInput, EditInput } from './contracts';

const missing = () => new BusinessError(404, 'NOT_FOUND', 'This project could not be found.');
export async function getBusiness(owner: string): Promise<BusinessProfile | null> {
  const rows = await database()`SELECT * FROM skillbridge.business_profiles WHERE profile_id = ${owner}`;
  return (rows[0] as BusinessProfile) ?? null;
}
export async function saveBusiness(owner: string, input: BusinessInput): Promise<BusinessProfile> {
  const rows = await database()`INSERT INTO skillbridge.business_profiles (profile_id,business_name,business_type,location,preferred_language)
    VALUES (${owner},${input.business_name},${input.business_type},${input.location},${input.preferred_language})
    ON CONFLICT (profile_id) DO UPDATE SET business_name=EXCLUDED.business_name,business_type=EXCLUDED.business_type,
    location=EXCLUDED.location,preferred_language=EXCLUDED.preferred_language,updated_at=now() RETURNING *`;
  return rows[0] as BusinessProfile;
}
export async function requireBusiness(owner: string) {
  const profile = await getBusiness(owner);
  if (!profile) throw new BusinessError(409, 'PROFILE_REQUIRED', 'Please complete your business profile first.');
  return profile;
}
export async function listProjects(owner: string): Promise<BusinessProject[]> {
  const rows = await database()`SELECT p.*, (SELECT count(*)::int FROM skillbridge.applications a WHERE a.project_id=p.id) AS application_count,
    '[]'::jsonb AS questions FROM skillbridge.projects p WHERE p.owner_profile_id=${owner} ORDER BY p.updated_at DESC LIMIT 200`;
  return rows as BusinessProject[];
}
export async function dashboardCounts(owner: string) {
  const rows = await database()`SELECT count(*)::int AS total, count(*) FILTER (WHERE status='draft')::int AS drafts,
    count(*) FILTER (WHERE status='published')::int AS published,
    (SELECT count(*)::int FROM skillbridge.applications a JOIN skillbridge.projects p2 ON p2.id=a.project_id WHERE p2.owner_profile_id=${owner}) AS applications
    FROM skillbridge.projects WHERE owner_profile_id=${owner}`;
  return rows[0] as { total: number; drafts: number; published: number; applications: number };
}
export async function getProject(owner: string, id: string): Promise<BusinessProject> {
  const rows = await database()`SELECT p.*, (SELECT count(*)::int FROM skillbridge.applications a WHERE a.project_id=p.id) AS application_count,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id',q.id,'question',q.question,'required',q.required,'position',q.position,'type',q.question_type,'options',q.options,'answer',a.answer) ORDER BY q.position,q.id)
      FROM skillbridge.project_questions q LEFT JOIN skillbridge.project_answers a ON a.question_id=q.id AND a.project_id=q.project_id WHERE q.project_id=p.id),'[]'::jsonb) AS questions
    FROM skillbridge.projects p WHERE p.id=${id} AND p.owner_profile_id=${owner}`;
  if (!rows[0]) throw missing();
  return rows[0] as BusinessProject;
}
export async function createDraft(owner: string, input: BriefInput): Promise<BusinessProject> {
  await requireBusiness(owner);
  const rows = await database()`INSERT INTO skillbridge.projects
    (owner_profile_id,title,summary,problem_statement,category,deliverables,required_skills,budget_label,timeline,preferred_language,location_text,remote_ok,mode,compensation,status,owner_confirmed)
    VALUES (${owner},${input.title},${input.summary},${input.problem_statement},${input.category},${input.deliverables},${input.required_skills},${input.budget_label},${input.timeline},${input.preferred_language},${input.location_text},${input.remote_ok},${input.mode},${input.compensation},'draft',false) RETURNING id`;
  return getProject(owner, rows[0].id);
}
export async function saveGenerated(owner: string, input: BriefInput, questions: string[], existing?: BusinessProject): Promise<BusinessProject> {
  const id = existing?.id ?? randomUUID();
  const sql = database();
  const write = existing ? sql`UPDATE skillbridge.projects SET title=${input.title},summary=${input.summary},problem_statement=${input.problem_statement},category=${input.category},
    deliverables=${input.deliverables},required_skills=${input.required_skills},budget_label=${input.budget_label},timeline=${input.timeline},preferred_language=${input.preferred_language},
    location_text=${input.location_text},remote_ok=${input.remote_ok},mode=${input.mode},compensation=${input.compensation},brief_version=brief_version+1,owner_confirmed=false,confirmed_version=NULL
    WHERE id=${id} AND owner_profile_id=${owner} AND status='draft' AND brief_version=${existing.brief_version} RETURNING id`
    : sql`INSERT INTO skillbridge.projects(id,owner_profile_id,title,summary,problem_statement,category,deliverables,required_skills,budget_label,timeline,preferred_language,location_text,remote_ok,mode,compensation)
      VALUES(${id},${owner},${input.title},${input.summary},${input.problem_statement},${input.category},${input.deliverables},${input.required_skills},${input.budget_label},${input.timeline},${input.preferred_language},${input.location_text},${input.remote_ok},${input.mode},${input.compensation}) RETURNING id`;
  try {
    await sql.transaction([
      ...(existing ? [
        sql`SELECT id FROM skillbridge.projects WHERE id=${id} AND owner_profile_id=${owner} FOR UPDATE`,
        sql`SELECT 1 / count(*)::int AS current_revision FROM skillbridge.projects
          WHERE id=${id} AND owner_profile_id=${owner} AND status='draft' AND brief_version=${existing.brief_version}`,
      ] : []),
      write,
      sql`DELETE FROM skillbridge.project_answers WHERE project_id=${id}`,
      sql`DELETE FROM skillbridge.project_questions WHERE project_id=${id}`,
      sql`INSERT INTO skillbridge.project_questions(project_id,question,position) SELECT ${id},q.question,(q.ordinality-1)::int
        FROM unnest(${questions}::text[]) WITH ORDINALITY AS q(question,ordinality)`,
    ]);
  } catch (error) {
    if ((error as { code?: string }).code === '22012') throw new BusinessError(409, 'STALE_DRAFT', 'The draft changed while creating another brief. Reload it and try again.');
    throw error;
  }
  return getProject(owner,id);
}
export async function editDraft(owner: string, id: string, input: EditInput): Promise<BusinessProject> {
  const project = await getProject(owner, id);
  if (project.status !== 'draft' || project.brief_version !== input.brief_version) throw new BusinessError(409, 'STALE_DRAFT', 'This draft changed or is already published. Reload it before editing.');
  const rows = await database()`UPDATE skillbridge.projects SET title=${input.title},summary=${input.summary},problem_statement=${input.problem_statement},category=${input.category},
    deliverables=${input.deliverables},required_skills=${input.required_skills},budget_label=${input.budget_label},timeline=${input.timeline},preferred_language=${input.preferred_language},
    location_text=${input.location_text},remote_ok=${input.remote_ok},mode=${input.mode},compensation=${input.compensation},owner_confirmed=false,confirmed_version=NULL,brief_version=brief_version+1,updated_at=now()
    WHERE id=${id} AND owner_profile_id=${owner} AND status='draft' AND brief_version=${input.brief_version} RETURNING id`;
  if (!rows[0]) throw new BusinessError(409, 'STALE_DRAFT', 'This draft changed or is already published. Reload it before editing.');
  return getProject(owner, id);
}
export async function deleteProject(owner: string, id: string): Promise<{ success: boolean }> {
  await getProject(owner, id);
  const sql = database();
  await sql.transaction([
    sql`DELETE FROM skillbridge.applications WHERE project_id=${id}`,
    sql`DELETE FROM skillbridge.project_answers WHERE project_id=${id}`,
    sql`DELETE FROM skillbridge.project_questions WHERE project_id=${id}`,
    sql`DELETE FROM skillbridge.projects WHERE id=${id} AND owner_profile_id=${owner}`,
  ]);
  return { success: true };
}

