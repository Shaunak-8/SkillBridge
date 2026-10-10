import { fail } from '@/lib/ws5/guard';
import { createTeam, loadTeam } from '@/lib/teams/repo';
import { createTeamSchema } from '@/lib/teams/schemas';
import { NO_STORE, studentRoute, teamFail } from '@/lib/teams/http';

/** A student starts a team for a project and becomes its leader. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const profileId = await studentRoute(request, { ids: [id], write: true, limit: { bucket: 'team-create', max: 10 } });
    if (typeof profileId !== 'string') return profileId;
    const body = createTeamSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return fail('Enter a team name of 2 to 80 characters (description up to 500).', 400);
    const teamId = await createTeam(profileId, id, body.data.name, body.data.description);
    return Response.json({ team: await loadTeam(profileId, teamId) }, { status: 201, headers: NO_STORE });
  } catch (error) { return teamFail(error); }
}
