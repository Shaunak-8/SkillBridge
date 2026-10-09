import { rateLimit, sameOrigin } from '@/lib/auth/security';
import { canTransition, isApplicationStatus, type ApplicationActor } from '@/lib/applications/status';
import { loadApplicationForStatus, updateApplicationStatus } from '@/lib/ws5/repo';
import { fail, guard, isUuid, unavailable } from '@/lib/ws5/guard';

const STATUS_LIMIT = 60;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return fail('Invalid request origin.', 403);
  const { id } = await params;
  if (!isUuid(id)) return fail('Application not found.', 404);
  try {
    const auth = await guard();
    if (auth instanceof Response) return auth;
    if (!await rateLimit('application-status', auth.profile.id, STATUS_LIMIT)) return fail('Too many attempts. Try again later.', 429);
    const body = await request.json().catch(() => null);
    if (!isApplicationStatus(body?.status)) return fail('Choose a valid status.', 400);
    const app = await loadApplicationForStatus(id);
    // Unrelated callers get 404 so application ids cannot be probed.
    let actor: ApplicationActor | null = null;
    if (app?.owner_profile_id === auth.profile.id) actor = 'business_owner';
    else if (app?.student_profile_id === auth.profile.id) actor = 'applicant';
    if (!app || !actor) return fail('Application not found.', 404);
    if (!canTransition(app.status, body.status, actor)) return fail(`Cannot change status from ${app.status} to ${body.status}.`, 409);
    const updated = await updateApplicationStatus(id, app.status, body.status);
    if (!updated) return fail('The application changed. Reload and try again.', 409);
    return Response.json({ application: updated });
  } catch {
    return unavailable();
  }
}
