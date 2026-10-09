import { ownedVerification, verificationError } from '@/lib/projects/verification';
import { database } from '@/lib/db';
import { jsonBody } from '@/lib/validation';
import { ApiFailure } from '@/lib/api';
import { projectBrief } from '@/lib/contracts';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { project, profileId } = await ownedVerification(id, request);
    if (project.status !== 'draft') throw new ApiFailure(409, 'PROJECT_LOCKED', 'Only drafts can be confirmed.');
    const body = await jsonBody(request);
    if (!Number.isInteger(body.briefVersion) || (body.briefVersion as number) < 1) throw new ApiFailure(400, 'INVALID_INPUT', 'Current briefVersion required.');
    const [updated] = await database()`UPDATE skillbridge.projects SET owner_confirmed = true, confirmed_version = brief_version
      WHERE id = ${id} AND owner_profile_id = ${profileId} AND status = 'draft' AND brief_version = ${body.briefVersion as number}
      AND length(trim(title)) > 0 AND length(trim(summary)) > 0 AND length(trim(problem_statement)) > 0 AND cardinality(deliverables) > 0 RETURNING *`;
    if (!updated) throw new ApiFailure(409, 'BRIEF_NOT_READY', 'Complete the current brief and deliverables, then review its latest version.');
    return Response.json({ success: true, message: 'Project confirmed', data: projectBrief(updated) });
  } catch (error) { return verificationError(error); }
}
