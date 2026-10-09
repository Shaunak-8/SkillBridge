import { listApplicationsForProfile } from '@/lib/ws5/repo';
import { guard, pageParams, unavailable } from '@/lib/ws5/guard';

export async function GET(request: Request) {
  try {
    const auth = await guard('student');
    if (auth instanceof Response) return auth;
    const page = pageParams(new URL(request.url));
    // One query: the student row is resolved from the profile id inside it (a profile without one gets an empty list).
    return Response.json(await listApplicationsForProfile(auth.profile.id, page));
  } catch {
    return unavailable();
  }
}
