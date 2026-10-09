import { listStudentApplications, studentIdForProfile } from '@/lib/ws5/repo';
import { guard, pageParams, unavailable } from '@/lib/ws5/guard';

export async function GET(request: Request) {
  try {
    const auth = await guard('student');
    if (auth instanceof Response) return auth;
    const page = pageParams(new URL(request.url));
    const studentId = await studentIdForProfile(auth.profile.id);
    if (!studentId) return Response.json({ items: [], total: 0, ...page });
    return Response.json(await listStudentApplications(studentId, page));
  } catch {
    return unavailable();
  }
}
