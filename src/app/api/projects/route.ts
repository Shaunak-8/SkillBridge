import { apiError, ApiFailure, requireApiIdentity } from '@/lib/api';
import { database } from '@/lib/db';
import { sameOrigin } from '@/lib/auth/security';
import { publishedProjects } from '@/lib/projects/repository';
import { jsonBody, textField } from '@/lib/validation';
import { projectBrief } from '@/lib/contracts';

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const limit = Number(params.get('limit') ?? 20), offset = Number(params.get('offset') ?? 0);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) throw new ApiFailure(400, 'INVALID_INPUT', 'Invalid pagination.');
    return Response.json({ items: await publishedProjects(limit, offset), limit, offset });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new ApiFailure(403, 'INVALID_ORIGIN', 'Invalid request origin.');
    const current = await requireApiIdentity('business');
    const body = await jsonBody(request);
    const title = textField(body.title, 200);
    const [business] = await database()`SELECT profile_id FROM skillbridge.business_profiles WHERE profile_id = ${current.profile.id}`;
    if (!business) throw new ApiFailure(409, 'BUSINESS_PROFILE_REQUIRED', 'Complete your business profile first.');
    const [project] = await database()`INSERT INTO skillbridge.projects(owner_profile_id, title) VALUES (${current.profile.id}, ${title}) RETURNING *`;
    return Response.json({ project: projectBrief(project) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
