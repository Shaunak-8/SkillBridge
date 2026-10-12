import { fail } from '@/lib/ws5/guard';
import { inviteStudent } from '@/lib/teams/repo';
import { inviteSchema } from '@/lib/teams/schemas';
import { NO_STORE, studentRoute, teamFail } from '@/lib/teams/http';

/** The team leader invites a student (or re-invites after a decline or expiry). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const profileId = await studentRoute(request, { ids: [id], write: true, limit: { bucket: 'team-invite', max: 30 } });
    if (typeof profileId !== 'string') return profileId;
    const body = inviteSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return fail('Choose a student to invite.', 400);
    const membershipId = await inviteStudent(profileId, id, body.data.studentId);
    if (!membershipId) {
      return fail('That student cannot be invited: they may already be on a team or have applied to this project on their own.', 409);
    }
    return Response.json({ membershipId }, { status: 201, headers: NO_STORE });
  } catch (error) { return teamFail(error); }
}
