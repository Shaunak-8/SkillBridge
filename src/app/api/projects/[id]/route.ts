import { revalidateTag } from 'next/cache';
import { apiError, ApiFailure, requireApiIdentity, requireOwnership } from '@/lib/api';
import { PROJECTS_BOARD_TAG } from '@/lib/ws5/cache-tags';
import { embedProject, scheduleEmbedding } from '@/lib/ai/embed-records';
import { database } from '@/lib/db';
import { sameOrigin } from '@/lib/auth/security';
import { jsonBody, uuid, textField, textList } from '@/lib/validation';
import { projectBrief } from '@/lib/contracts';
import { canTransition } from '@/lib/projects/lifecycle';
import type { ProjectStatus } from '@/types/backend';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const id = uuid((await context.params).id);
    const [project] = await database()`SELECT * FROM skillbridge.projects WHERE id = ${id}`;
    if (!project) throw new ApiFailure(404, 'NOT_FOUND', 'Project not found.');
    if (project.status !== 'published') {
      const current = await requireApiIdentity('business');
      requireOwnership(project.owner_profile_id, current.profile.id);
    }
    return Response.json({ project: projectBrief(project) });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!sameOrigin(request)) throw new ApiFailure(403, 'INVALID_ORIGIN', 'Invalid request origin.');
    const current = await requireApiIdentity('business');
    const id = uuid((await context.params).id);
    const body = await jsonBody(request);
    const [project] = await database()`SELECT * FROM skillbridge.projects WHERE id = ${id}`;
    if (!project) throw new ApiFailure(404, 'NOT_FOUND', 'Project not found.');
    requireOwnership(project.owner_profile_id, current.profile.id);
    if (body.action === 'edit') {
      if (!['draft', 'published'].includes(project.status)) throw new ApiFailure(409, 'INVALID_STATE', 'Project brief is locked.');
      const title = textField(body.title, 200), summary = textField(body.summary, 1000), description = textField(body.description, 10000);
      const skills = textList(body.requiredSkills), deliverables = textList(body.deliverables);
      const rows = await database()`UPDATE skillbridge.projects SET title = ${title}, summary = ${summary}, problem_statement = ${description},
        required_skills = ${skills}, deliverables = ${deliverables}
        WHERE id = ${id} AND owner_profile_id = ${current.profile.id} AND brief_version = ${project.brief_version} AND status = ${project.status} RETURNING *`;
      if (!rows[0]) throw new ApiFailure(409, 'CONFLICT', 'Project changed. Reload and retry.');
      return Response.json({ project: projectBrief(rows[0]) });
    }
    if (body.action === 'confirm') {
      if (project.status !== 'draft') throw new ApiFailure(409, 'INVALID_STATE', 'Only drafts can be confirmed.');
      const rows = await database()`UPDATE skillbridge.projects SET owner_confirmed = true, confirmed_version = brief_version
        WHERE id = ${id} AND owner_profile_id = ${current.profile.id} AND status = 'draft' AND brief_version = ${project.brief_version} RETURNING *`;
      if (!rows[0]) throw new ApiFailure(409, 'CONFLICT', 'Project changed. Reload and retry.');
      return Response.json({ project: projectBrief(rows[0]) });
    }
    const status = body.status as ProjectStatus;
    if (body.briefVersion !== undefined && body.briefVersion !== project.brief_version) throw new ApiFailure(409, 'STALE_BRIEF', 'Project changed. Reload before changing its status.');
    if (!canTransition(project.status, status)) throw new ApiFailure(409, 'INVALID_TRANSITION', 'Invalid project transition.');
    const rows = await database()`UPDATE skillbridge.projects SET status = ${status}, published_at = CASE WHEN ${status} = 'published' THEN COALESCE(published_at, now()) ELSE published_at END
      WHERE id = ${id} AND owner_profile_id = ${current.profile.id} AND status = ${project.status} AND brief_version = ${project.brief_version} RETURNING *`;
    if (!rows[0]) throw new ApiFailure(409, 'CONFLICT', 'Project changed. Reload and retry.');
    // Publishing, closing or cancelling changes what the public board shows. Best effort: the board also
    // expires on its own (see PROJECTS_BOARD_REVALIDATE_SECONDS), so a failed invalidation must not fail the request.
    try { revalidateTag(PROJECTS_BOARD_TAG, 'max'); } catch { /* no Next.js request context (e.g. unit tests) */ }
    if (status === 'published') scheduleEmbedding(() => embedProject(id));
    return Response.json({ project: projectBrief(rows[0]) });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Required questions are unanswered')) return apiError(new ApiFailure(409, 'PROJECT_NOT_READY', 'Answer all required questions before publishing.'));
    if ((error as { code?: string })?.code === '23514') return apiError(new ApiFailure(409, 'PROJECT_NOT_READY', 'Confirm a complete brief and answer required questions before publishing.'));
    return apiError(error);
  }
}
