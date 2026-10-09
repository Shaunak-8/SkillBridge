import type { ApplicationDTO, ProjectBrief } from '@/types/backend';
type Row = Record<string, unknown>;
export function projectBrief(row: Row): ProjectBrief {
  return {
    id: row.id as string, ownerId: row.owner_profile_id as string,
    title: row.title as string, summary: row.summary as string, description: row.problem_statement as string,
    status: row.status as ProjectBrief['status'], requiredSkills: row.required_skills as string[], deliverables: row.deliverables as string[],
    ownerConfirmed: row.owner_confirmed as boolean, briefVersion: row.brief_version as number, confirmedVersion: row.confirmed_version as number | null,
    confirmedAt: (row.confirmed_at as string | null) ?? null,
    createdAt: row.created_at as string, updatedAt: row.updated_at as string,
  };
}
export function applicationDTO(row: Row): ApplicationDTO {
  return { id: row.id as string, projectId: row.project_id as string, studentId: row.student_id as string,
    status: row.status as ApplicationDTO['status'], coverNote: row.cover_note as string, createdAt: row.created_at as string };
}
