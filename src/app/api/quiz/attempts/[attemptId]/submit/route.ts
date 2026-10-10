import { submitAttempt } from '@/lib/quiz/attempts';
import { respond, studentPrelude } from '@/lib/quiz/student-route';
import { unavailable } from '@/lib/ws5/guard';

/** Idempotent. Returns only { status: 'submitted' }: students never see scores. */
export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  try {
    const profile = await studentPrelude(request, [attemptId], true, 'quiz-submit', 10);
    if (profile instanceof Response) return profile;
    return respond(await submitAttempt(profile.id, attemptId));
  } catch {
    return unavailable();
  }
}
