import { getCurrent } from '@/lib/quiz/attempts';
import { respond, studentPrelude } from '@/lib/quiz/student-route';
import { unavailable } from '@/lib/ws5/guard';

export async function GET(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  try {
    const profile = await studentPrelude(request, [attemptId], false, 'quiz-current', 120);
    if (profile instanceof Response) return profile;
    return respond(await getCurrent(profile.id, attemptId));
  } catch {
    return unavailable();
  }
}
