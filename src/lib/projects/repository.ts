import 'server-only';
import { database } from '@/lib/db';
import type { Project, ProjectMode } from '@/types';
import type { ProjectStatus } from '@/types/backend';

type ProjectRow = { id: string; title: string; summary: string; problem_statement: string; owner_profile_id: string; business_name: string; category: string; location_text: string; status: ProjectStatus; mode: ProjectMode; budget_label: string; created_at: string; timeline: string; required_skills: string[]; applicants: number };
function project(row: ProjectRow): Project {
  return { id: row.id, title: row.title, summary: row.summary, description: row.problem_statement,
    businessId: row.owner_profile_id, businessName: row.business_name, category: row.category, location: row.location_text,
    status: row.status, mode: row.mode, budgetLabel: row.budget_label, postedAt: new Date(row.created_at).toLocaleDateString('en-IN'), duration: row.timeline,
    requirements: row.required_skills.map((name, i) => ({ id: `${row.id}-${i}`, skill: { id: name, name, type: 'technical' }, level: 'intermediate', essential: true })),
    milestones: [], applicants: Number(row.applicants),
  };
}
export async function publishedProjects(limit = 50, offset = 0): Promise<Project[]> {
  const rows = await database()`SELECT p.*, COALESCE(b.business_name, owner.full_name) AS business_name,
    (SELECT count(*) FROM skillbridge.applications a WHERE a.project_id = p.id)::integer AS applicants
    FROM skillbridge.projects p JOIN skillbridge.profiles owner ON owner.id = p.owner_profile_id
    LEFT JOIN skillbridge.business_profiles b ON b.profile_id = p.owner_profile_id
    WHERE p.status = 'published' ORDER BY p.created_at DESC, p.id LIMIT ${limit} OFFSET ${offset}`;
  return rows.map(row => project(row as ProjectRow));
}
export async function publishedProject(id: string): Promise<Project | null> {
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) return null;
  const rows = await database()`SELECT p.*, COALESCE(b.business_name, owner.full_name) AS business_name,
    (SELECT count(*) FROM skillbridge.applications a WHERE a.project_id = p.id)::integer AS applicants
    FROM skillbridge.projects p JOIN skillbridge.profiles owner ON owner.id = p.owner_profile_id
    LEFT JOIN skillbridge.business_profiles b ON b.profile_id = p.owner_profile_id
    WHERE p.id = ${id} AND p.status = 'published'`;
  return rows[0] ? project(rows[0] as ProjectRow) : null;
}
export async function ownedProjects(profileId: string): Promise<Project[]> {
  const rows = await database()`SELECT p.*, COALESCE(b.business_name, owner.full_name) AS business_name,
    (SELECT count(*) FROM skillbridge.applications a WHERE a.project_id = p.id)::integer AS applicants
    FROM skillbridge.projects p JOIN skillbridge.profiles owner ON owner.id = p.owner_profile_id
    LEFT JOIN skillbridge.business_profiles b ON b.profile_id = p.owner_profile_id
    WHERE p.owner_profile_id = ${profileId} ORDER BY p.created_at DESC, p.id LIMIT 100`;
  return rows.map(row => project(row as ProjectRow));
}
