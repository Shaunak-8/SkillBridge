import 'server-only';
import { sameOrigin } from '@/lib/auth/security';
import { fail, guard, isUuid, type Profile } from '@/lib/ws5/guard';
import { isEligible, loadQuizContext, type QuizContext, type QuizDto } from './repo';
import { questionsSchema, type QuizQuestionInput } from './schema';
import { QUIZ_MIN_APPLICANTS } from './constants';

/**
 * Shared prelude of the business quiz routes: same-origin on writes, uuid, signed-in business, project exists (404), caller owns it (403).
 * Returns the loaded context, or a Response to return directly.
 */
export async function ownedQuizContext(request: Request, id: string, write: boolean): Promise<{ profile: Profile; ctx: QuizContext } | Response> {
  if (write && !sameOrigin(request)) return fail('Invalid request origin.', 403);
  if (!isUuid(id)) return fail('Project not found.', 404);
  const auth = await guard('business');
  if (auth instanceof Response) return auth;
  const ctx = await loadQuizContext(id);
  if (!ctx) return fail('Project not found.', 404);
  if (ctx.project.ownerProfileId !== auth.profile.id) return fail('You do not own this project.', 403);
  return { profile: auth.profile, ctx };
}

/** The response body shared by GET and the write routes. Correct answers go to the owner only. */
export const quizState = (ctx: QuizContext) => ({
  applicantCount: ctx.applicantCount,
  minApplicants: QUIZ_MIN_APPLICANTS,
  eligible: isEligible(ctx.applicantCount, ctx.quiz),
  quiz: ctx.quiz,
});

/** Strips ids and positions so stored questions can be re-validated with the same strict schema used for AI output and edits. */
export function validatedQuestions(quiz: QuizDto): QuizQuestionInput[] | null {
  const parsed = questionsSchema.safeParse(
    [...quiz.questions].sort((a, b) => a.position - b.position).map((q) =>
      q.kind === 'mcq'
        ? { kind: q.kind, prompt: q.prompt, options: q.options, correctIndex: q.correctIndex }
        : { kind: q.kind, prompt: q.prompt, rubric: q.rubric }),
  );
  return parsed.success ? parsed.data : null;
}
