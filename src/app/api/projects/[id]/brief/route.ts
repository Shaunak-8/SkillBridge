import { ownedVerification, editable, verificationError } from '@/lib/projects/verification';
import { database } from '@/lib/db';
import { jsonBody, textField, textList } from '@/lib/validation';
import { ApiFailure } from '@/lib/api';
import { projectBrief } from '@/lib/contracts';
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { project, profileId } = await ownedVerification(id, request);
    editable(project);
    const body = await jsonBody(request);
    const allowed = ['title', 'summary', 'description', 'deliverables', 'requiredSkills', 'briefVersion'];
    if (Object.keys(body).some(key => !allowed.includes(key)) || !Object.keys(body).some(key => key !== 'briefVersion')) throw new ApiFailure(400, 'INVALID_INPUT', 'Provide supported brief fields.');
    if (body.briefVersion !== undefined && body.briefVersion !== project.brief_version) throw new ApiFailure(409, 'STALE_BRIEF', 'Project changed. Reload before editing.');
    const title = body.title === undefined ? project.title : textField(body.title, 200);
    const summary = body.summary === undefined ? project.summary : textField(body.summary, 1000);
    const description = body.description === undefined ? project.problem_statement : textField(body.description, 10000);
    const deliverables = body.deliverables === undefined ? project.deliverables : textList(body.deliverables);
    const skills = body.requiredSkills === undefined ? project.required_skills : textList(body.requiredSkills);
    const [updated] = await database()`UPDATE skillbridge.projects SET title = ${title}, summary = ${summary}, problem_statement = ${description},
      deliverables = ${deliverables}, required_skills = ${skills} WHERE id = ${id} AND owner_profile_id = ${profileId}
      AND brief_version = ${project.brief_version} AND status = ${project.status} RETURNING *`;
    if (!updated) throw new ApiFailure(409, 'CONFLICT', 'Project changed. Reload and retry.');
    return Response.json({ success: true, data: projectBrief(updated) });
  } catch (error) { return verificationError(error); }
}
