import { apiError, ApiFailure, requireApiIdentity } from '@/lib/api';
import { database } from '@/lib/db';
import { sameOrigin } from '@/lib/auth/security';
import { jsonBody, textField, uuid } from '@/lib/validation';
import { applicationDTO } from '@/lib/contracts';

export async function GET() {
  try {
    const current = await requireApiIdentity();
    if (current.profile.role === 'student') {
      const items = await database()`SELECT a.* FROM skillbridge.applications a JOIN skillbridge.student_profiles s ON s.id = a.student_id
        WHERE s.profile_id = ${current.profile.id} ORDER BY a.created_at DESC LIMIT 100`;
      return Response.json({ items: items.map(applicationDTO) });
    }
    if (current.profile.role !== 'business') throw new ApiFailure(403, 'FORBIDDEN', 'Access denied.');
    const items = await database()`SELECT a.* FROM skillbridge.applications a JOIN skillbridge.projects p ON p.id = a.project_id
      WHERE p.owner_profile_id = ${current.profile.id} ORDER BY a.created_at DESC LIMIT 100`;
    return Response.json({ items: items.map(applicationDTO) });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new ApiFailure(403, 'INVALID_ORIGIN', 'Invalid request origin.');
    const current = await requireApiIdentity('student');
    const body = await jsonBody(request);
    if (typeof body.projectId !== 'string') throw new ApiFailure(400, 'INVALID_INPUT', 'Project ID required.');
    const projectId = uuid(body.projectId), note = textField(body.coverNote, 2000);
    const [student] = await database()`SELECT id FROM skillbridge.student_profiles WHERE profile_id = ${current.profile.id}`;
    if (!student) throw new ApiFailure(409, 'STUDENT_PROFILE_REQUIRED', 'Complete your student profile first.');
    const [application] = await database()`INSERT INTO skillbridge.applications(project_id, student_id, cover_note)
      SELECT id, ${student.id}, ${note} FROM skillbridge.projects WHERE id = ${projectId} AND status = 'published' RETURNING *`;
    if (!application) throw new ApiFailure(409, 'PROJECT_UNAVAILABLE', 'Project is not accepting applications.');
    return Response.json({ application: applicationDTO(application) }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string })?.code === '23505') return apiError(new ApiFailure(409, 'ALREADY_APPLIED', 'You already applied to this project.'));
    if ((error as { code?: string })?.code === '23514') return apiError(new ApiFailure(409, 'PROJECT_UNAVAILABLE', 'Project is not accepting applications.'));
    return apiError(error);
  }
}
