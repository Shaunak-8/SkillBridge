import { rateLimit, sameOrigin } from '@/lib/auth/security';
import { insertApplication, insertComplexApplication, loadProject, studentIdForProfile } from '@/lib/ws5/repo';
import { fail, guard, isUuid, unavailable } from '@/lib/ws5/guard';
import { teamErrorResponse } from '@/lib/teams/errors';

const MAX_NOTE = 2000;
const APPLY_LIMIT = 20;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return fail('Invalid request origin.', 403);
  const { id } = await params;
  if (!isUuid(id)) return fail('Project not found.', 404);
  try {
    const auth = await guard('student');
    if (auth instanceof Response) return auth;
    if (!await rateLimit('apply', auth.profile.id, APPLY_LIMIT)) return fail('Too many attempts. Try again later.', 429);
    const body = await request.json().catch(() => null);
    if (!body) return fail('Invalid payload', 400);

    const note = typeof body?.cover_note === 'string' ? body.cover_note.trim() : '';
    const pitch = typeof body?.pitch === 'string' ? body.pitch.trim() : '';
    if (!note && !pitch) return fail(`Write a cover note or pitch (1-${MAX_NOTE} characters).`, 400);
    if (note.length > MAX_NOTE || pitch.length > MAX_NOTE) return fail(`Write a cover note or pitch (1-${MAX_NOTE} characters).`, 400);

    const studentId = await studentIdForProfile(auth.profile.id);
    if (!studentId) return fail('Complete your student profile before applying.', 409);
    
    const project = await loadProject(id);
    if (!project || project.status !== 'published') return fail('Project not found.', 404);

    // A team application is submitted by the team leader; the database verifies the leader and the 2-5 roster.
    const teamId = body.team_id;
    if (teamId !== undefined && (typeof teamId !== 'string' || !isUuid(teamId))) return fail('Invalid team.', 400);

    const isComplexApplication = Boolean(teamId || pitch || body.answers || body.availability_hours !== undefined || body.available_from);
    const created = isComplexApplication
      ? await insertComplexApplication(id, studentId, {
          cover_note: note,
          pitch: pitch || undefined,
          answers: body.answers,
          availability_hours: body.availability_hours,
          available_from: body.available_from ? new Date(body.available_from) : undefined,
        }, teamId)
      : await insertApplication(id, studentId, note);

    if (!created) return fail('Project not found.', 404);
    return Response.json({ application: created }, { status: 201 });
  } catch (error) {
    const { code, constraint } = error as { code?: string; constraint?: string };
    if (code === '23505' && constraint !== 'applications_team_idx') return fail('You have already applied', 409);
    const mapped = teamErrorResponse(error);
    return mapped.status === 503 ? unavailable() : fail(mapped.message, mapped.status);
  }
}
