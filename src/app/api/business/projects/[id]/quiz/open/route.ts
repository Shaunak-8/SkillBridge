import { ownedQuizContext, validatedQuestions } from '@/lib/quiz/owner';
import { isEligible, loadQuizContext, openQuiz } from '@/lib/quiz/repo';
import { fail, unavailable } from '@/lib/ws5/guard';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const owned = await ownedQuizContext(request, id, true);
    if (owned instanceof Response) return owned;
    const { ctx } = owned;
    if (!ctx.quiz) return fail('Create the quiz first.', 404);
    if (ctx.quiz.status !== 'draft') return fail('This quiz is already open or closed.', 409);
    if (ctx.project.status !== 'published') return fail('Publish the project before opening the quiz.', 409);
    if (!isEligible(ctx.applicantCount, ctx.quiz)) return fail('A quiz needs more than 3 applicants.', 409);
    if (!validatedQuestions(ctx.quiz)) return fail('A quiz needs exactly 5 valid questions.', 409);
    if (!await openQuiz(id)) return fail('This quiz is already open or closed.', 409);
    const fresh = await loadQuizContext(id);
    return Response.json({ quiz: fresh?.quiz ?? null });
  } catch {
    return unavailable();
  }
}
