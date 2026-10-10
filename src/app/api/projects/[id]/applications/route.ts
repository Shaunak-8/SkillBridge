import { rateLimit, sameOrigin } from '@/lib/auth/security';
import { insertApplication, insertComplexApplication, loadProject, studentIdForProfile } from '@/lib/ws5/repo';
import { fail, guard, isUuid, unavailable } from '@/lib/ws5/guard';

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
    
    // Complex applications must include evidence. Keep legacy cover-note submissions compatible.
    const isComplexApplication = Boolean(
      body.resume_id ||
      (Array.isArray(body.portfolio_item_ids) && body.portfolio_item_ids.length > 0) ||
      body.answers ||
      body.availability_hours !== undefined ||
      body.available_from,
    );
    if (isComplexApplication && !body.resume_id && (!Array.isArray(body.portfolio_item_ids) || body.portfolio_item_ids.length === 0)) {
       return fail('You must provide either a resume or select at least one portfolio item.', 400);
    }

    const project = await loadProject(id);
    if (!project || project.status !== 'published') return fail('Project not found.', 404);
    
    const created = isComplexApplication
      ? await insertComplexApplication(id, studentId, {
        cover_note: note,
        pitch,
        resume_id: body.resume_id,
        portfolio_item_ids: body.portfolio_item_ids,
        answers: body.answers,
        availability_hours: body.availability_hours,
        available_from: body.available_from ? new Date(body.available_from) : undefined,
      })
      : await insertApplication(id, studentId, note);
    
    if (!created) return fail('Project not found.', 404);
    return Response.json({ application: created }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') return fail('You have already applied', 409);
    return unavailable();
  }
}
