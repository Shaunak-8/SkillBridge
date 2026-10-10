import { fail } from '@/lib/ws5/guard';
import { searchInvitableStudents } from '@/lib/teams/repo';
import { searchQuerySchema } from '@/lib/teams/schemas';
import { NO_STORE, studentRoute, teamFail } from '@/lib/teams/http';

/** Teammate search for the invite box (opt-in students who are not already on a team for this project). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const profileId = await studentRoute(request, { ids: [id], limit: { bucket: 'team-search', max: 120 } });
    if (typeof profileId !== 'string') return profileId;
    const q = searchQuerySchema.safeParse(new URL(request.url).searchParams.get('q') ?? '');
    if (!q.success) return fail('Type at least 2 characters to search.', 400);
    return Response.json({ students: await searchInvitableStudents(profileId, id, q.data) }, { headers: NO_STORE });
  } catch (error) { return teamFail(error); }
}
