import { apiError, ApiFailure, requireApiIdentity } from '@/lib/api';
import { database } from '@/lib/db';
import { sameOrigin } from '@/lib/auth/security';
import { jsonBody, uuid } from '@/lib/validation';
import { applicationDTO } from '@/lib/contracts';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!sameOrigin(request)) throw new ApiFailure(403, 'INVALID_ORIGIN', 'Invalid request origin.');
    const current = await requireApiIdentity('business');
    const id = uuid((await context.params).id), body = await jsonBody(request);
    const status = body.status;
    if (typeof status !== 'string' || !['reviewing', 'shortlisted', 'accepted', 'declined'].includes(status)) throw new ApiFailure(400, 'INVALID_INPUT', 'Invalid application status.');
    const [application] = await database()`UPDATE skillbridge.applications a SET status = ${status}, updated_at = now()
      FROM skillbridge.projects p WHERE p.id = a.project_id AND p.owner_profile_id = ${current.profile.id}
      AND a.id = ${id} AND p.status IN ('published', 'in_progress') AND a.status NOT IN ('accepted', 'declined', 'withdrawn') RETURNING a.*`;
    if (!application) throw new ApiFailure(409, 'APPLICATION_UNAVAILABLE', 'Application is unavailable or cannot be changed.');
    return Response.json({ application: applicationDTO(application) });
  } catch (error) { return apiError(error); }
}
