import { ownedQuizContext } from '@/lib/quiz/owner';
import { closeQuiz, loadQuizContext } from '@/lib/quiz/repo';
import { fail, unavailable } from '@/lib/ws5/guard';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const owned = await ownedQuizContext(request, id, true);
    if (owned instanceof Response) return owned;
    const { ctx } = owned;
    if (!ctx.quiz) return fail('Create the quiz first.', 404);
    if (ctx.quiz.status !== 'open') return fail('Only an open quiz can be closed.', 409);
    if (!await closeQuiz(id)) return fail('Only an open quiz can be closed.', 409);
    const fresh = await loadQuizContext(id);
    return Response.json({ quiz: fresh?.quiz ?? null });
  } catch {
    return unavailable();
  }
}
