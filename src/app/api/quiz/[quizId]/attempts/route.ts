import { startAttempt, startBodySchema } from '@/lib/quiz/attempts';
import { respond, studentPrelude } from '@/lib/quiz/student-route';
import { fail, unavailable } from '@/lib/ws5/guard';

/** Start the attempt (201) or resume the in-progress one (200). Consent and a proctoring mode are mandatory. */
export async function POST(request: Request, { params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  try {
    const profile = await studentPrelude(request, [quizId], true, 'quiz-start', 10);
    if (profile instanceof Response) return profile;
    const parsed = startBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail('Consent and a proctoring mode are required.', 400);
    const result = await startAttempt(profile.id, quizId, parsed.data);
    if (!result.ok) return respond(result);
    const { created, ...dto } = result.data;
    return respond({ ok: true, data: dto }, created ? 201 : 200);
  } catch {
    return unavailable();
  }
}
