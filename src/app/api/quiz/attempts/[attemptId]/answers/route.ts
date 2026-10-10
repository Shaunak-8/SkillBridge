import { answerBodySchema, saveAnswer } from '@/lib/quiz/attempts';
import { respond, studentPrelude } from '@/lib/quiz/student-route';
import { fail, unavailable } from '@/lib/ws5/guard';

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  try {
    const profile = await studentPrelude(request, [attemptId], true, 'quiz-answer', 60);
    if (profile instanceof Response) return profile;
    const parsed = answerBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail('Invalid answer.', 400);
    const result = await saveAnswer(profile.id, attemptId, parsed.data);
    return respond(result.ok ? { ok: true, data: { ok: true, ...result.data } } : result);
  } catch {
    return unavailable();
  }
}
