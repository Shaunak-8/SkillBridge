import { fail } from '@/lib/ws5/guard';
import { loadTeam } from '@/lib/teams/repo';
import { NO_STORE, studentRoute, teamFail } from '@/lib/teams/http';

/** The team and its roster, for its active members only. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const profileId = await studentRoute(request, { ids: [id] });
    if (typeof profileId !== 'string') return profileId;
    const team = await loadTeam(profileId, id);
    return team ? Response.json({ team }, { headers: NO_STORE }) : fail('Team not found.', 404);
  } catch (error) { return teamFail(error); }
}
