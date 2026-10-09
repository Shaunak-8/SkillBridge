import { loadQuizContext, listQuizResults } from '@/lib/quiz/repo';
import { fail, guard, isUuid, unavailable } from '@/lib/ws5/guard';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return fail('Project not found.', 404);
  try {
    const auth = await guard('business');
    if (auth instanceof Response) return auth;
    // Parallel round trip, as in the applications route. The results are discarded unless the owner check passes.
    const [ctx, items] = await Promise.all([loadQuizContext(id), listQuizResults(id)]);
    if (!ctx) return fail('Project not found.', 404);
    if (ctx.project.ownerProfileId !== auth.profile.id) return fail('You do not own this project.', 403);
    if (!ctx.quiz) return fail('No quiz for this project.', 404);
    return Response.json({ items });
  } catch {
    return unavailable();
  }
}
