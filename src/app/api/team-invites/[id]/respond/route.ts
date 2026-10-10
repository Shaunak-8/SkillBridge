import { fail } from '@/lib/ws5/guard';
import { respondToInvite } from '@/lib/teams/repo';
import { respondSchema } from '@/lib/teams/schemas';
import { NO_STORE, studentRoute, teamFail } from '@/lib/teams/http';

/** The invited student accepts or declines. `id` is the invitation (membership) id. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const profileId = await studentRoute(request, { ids: [id], write: true, limit: { bucket: 'team-respond', max: 30 } });
    if (typeof profileId !== 'string') return profileId;
    const body = respondSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return fail('Choose accept or decline.', 400);
    const result = await respondToInvite(profileId, id, body.data.accept);
    return result ? Response.json(result, { headers: NO_STORE }) : fail('This invitation is no longer open.', 404);
  } catch (error) { return teamFail(error); }
}
