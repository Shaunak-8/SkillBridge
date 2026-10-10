import { eventsBodySchema, recordEvents } from '@/lib/quiz/attempts';
import { respond, studentPrelude } from '@/lib/quiz/student-route';
import { fail, unavailable } from '@/lib/ws5/guard';

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  try {
    const profile = await studentPrelude(request, [attemptId], true, 'quiz-events', 120);
    if (profile instanceof Response) return profile;
    const parsed = eventsBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail('Invalid events.', 400);
    return respond(await recordEvents(profile.id, attemptId, parsed.data));
  } catch {
    return unavailable();
  }
}
