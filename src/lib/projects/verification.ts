import 'server-only';
import { ApiFailure, apiError, requireApiIdentity, requireOwnership } from '@/lib/api';
import { sameOrigin } from '@/lib/auth/security';
import { database } from '@/lib/db';
import { uuid } from '@/lib/validation';
import type { ProjectQuestion } from '@/types';

export async function ownedVerification(id: string, request?: Request) {
  if (request && !sameOrigin(request)) throw new ApiFailure(403, 'INVALID_ORIGIN', 'Invalid request origin.');
  const current = await requireApiIdentity('business');
  uuid(id);
  const [project] = await database()`SELECT * FROM skillbridge.projects WHERE id = ${id}`;
  if (!project) throw new ApiFailure(404, 'NOT_FOUND', 'Project not found.');
  requireOwnership(project.owner_profile_id, current.profile.id);
  return { project, profileId: current.profile.id };
}
export async function verificationQuestions(id: string): Promise<ProjectQuestion[]> {
  const rows = await database()`SELECT q.*, a.answer AS saved_answer FROM skillbridge.project_questions q
    LEFT JOIN skillbridge.project_answers a ON a.question_id = q.id AND a.project_id = q.project_id
    WHERE q.project_id = ${id} ORDER BY q.position, q.id`;
  return rows.map(row => ({ id: row.id, projectId: row.project_id, text: row.question, type: row.question_type,
    options: row.options ?? undefined, sortOrder: row.position, required: row.required, answerText: row.saved_answer ?? undefined }));
}
export function verificationError(error: unknown) {
  if (error instanceof Error && error.message.includes('Required questions are unanswered')) return apiError(new ApiFailure(409, 'VERIFICATION_NOT_READY', 'Answer all required questions before confirming or publishing.'));
  if ((error as { code?: string })?.code === '23514') return apiError(new ApiFailure(409, 'VERIFICATION_NOT_READY', 'Complete required answers and a valid brief before confirming. Started projects cannot be edited.'));
  if ((error as { code?: string })?.code === '23503') return apiError(new ApiFailure(400, 'INVALID_QUESTION', 'Question does not belong to this project.'));
  return apiError(error);
}
export function editable(project: Record<string, unknown>) {
  if (!['draft', 'published'].includes(project.status as string)) throw new ApiFailure(409, 'PROJECT_LOCKED', 'Project verification is locked after work starts.');
}
