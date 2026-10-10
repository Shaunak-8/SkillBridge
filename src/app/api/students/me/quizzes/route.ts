import { listMyQuizzes } from '@/lib/quiz/attempts';
import { studentPrelude } from '@/lib/quiz/student-route';
import { unavailable } from '@/lib/ws5/guard';

export async function GET(request: Request) {
  try {
    const profile = await studentPrelude(request, [], false, 'quiz-list', 60);
    if (profile instanceof Response) return profile;
    return Response.json(await listMyQuizzes(profile.id));
  } catch {
    return unavailable();
  }
}
