import { rateLimit } from '@/lib/auth/security';
import { GENERATE_RATE_LIMIT } from '@/lib/quiz/constants';
import { generateQuiz, QuizGenerationError, sourceHash } from '@/lib/quiz/generate';
import { ownedQuizContext, quizState } from '@/lib/quiz/owner';
import { isEligible, loadQuizContext, saveDraftQuiz, updateDraftQuiz } from '@/lib/quiz/repo';
import { editQuizSchema } from '@/lib/quiz/schema';
import { fail, unavailable } from '@/lib/ws5/guard';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const owned = await ownedQuizContext(request, id, false);
    if (owned instanceof Response) return owned;
    return Response.json(quizState(owned.ctx));
  } catch {
    return unavailable();
  }
}

/** Generate the AI draft, or regenerate while it is still a draft. */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const owned = await ownedQuizContext(request, id, true);
    if (owned instanceof Response) return owned;
    const { profile, ctx } = owned;
    if (ctx.quiz && ctx.quiz.status !== 'draft') return fail('This quiz is already open or closed.', 409);
    if (ctx.project.status !== 'published') return fail('Publish the project before creating a quiz.', 409);
    if (!isEligible(ctx.applicantCount, ctx.quiz)) return fail('A quiz needs more than 3 applicants.', 409);
    if (!await rateLimit('quiz-generate', profile.id, GENERATE_RATE_LIMIT)) return fail('Too many attempts. Try again later.', 429);
    let generated;
    try {
      generated = await generateQuiz(ctx.project.source);
    } catch (e) {
      if (e instanceof QuizGenerationError) return fail('We could not generate the quiz. Please try again.', 502);
      throw e;
    }
    if (!await saveDraftQuiz(id, profile.id, sourceHash(ctx.project.source), generated.model, generated.questions)) {
      return fail('This quiz is already open or closed.', 409);
    }
    const fresh = await loadQuizContext(id);
    return Response.json({ quiz: fresh?.quiz ?? null }, { status: 201 });
  } catch {
    return unavailable();
  }
}

/** Edit the draft. Never allowed once the quiz is open or closed. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const owned = await ownedQuizContext(request, id, true);
    if (owned instanceof Response) return owned;
    const { ctx } = owned;
    if (!ctx.quiz) return fail('Create the quiz first.', 404);
    if (ctx.quiz.status !== 'draft') return fail('An open or closed quiz cannot be edited.', 409);
    const body = await request.json().catch(() => null);
    const parsed = editQuizSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid quiz.', 400);
    if (!await updateDraftQuiz(id, parsed.data)) return fail('An open or closed quiz cannot be edited.', 409);
    const fresh = await loadQuizContext(id);
    return Response.json({ quiz: fresh?.quiz ?? null });
  } catch {
    return unavailable();
  }
}
