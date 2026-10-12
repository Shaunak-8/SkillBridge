import { fail } from '@/lib/ws5/guard';
import { cancelInvite } from '@/lib/teams/repo';
import { NO_STORE, studentRoute, teamFail } from '@/lib/teams/http';

/** The team leader withdraws a pending invitation. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; membershipId: string }> }) {
  const { id, membershipId } = await params;
  try {
    const profileId = await studentRoute(request, { ids: [id, membershipId], write: true, limit: { bucket: 'team-invite', max: 30 } });
    if (typeof profileId !== 'string') return profileId;
    return await cancelInvite(profileId, id, membershipId)
      ? Response.json({ cancelled: true }, { headers: NO_STORE })
      : fail('That invitation is no longer pending.', 404);
  } catch (error) { return teamFail(error); }
}
