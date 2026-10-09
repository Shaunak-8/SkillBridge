import { recommendProjectsForStudent } from '@/lib/matching/rank';
import { loadPublishedProjects, loadStudentByProfile, retrieverForStudent } from '@/lib/ws5/repo';
import { guard, unavailable } from '@/lib/ws5/guard';

export async function GET() {
  try {
    const auth = await guard('student');
    if (auth instanceof Response) return auth;
    const student = await loadStudentByProfile(auth.profile.id);
    if (!student) return Response.json({ items: [] });
    const projects = await loadPublishedProjects();
    const byId = new Map(projects.map((p) => [p.id, p]));
    // It is the student's own view, so their private visibility must not hide results from them.
    const results = recommendProjectsForStudent({ ...student, visibility: 'matching' }, projects, {}, await retrieverForStudent(student.id, projects.map((p) => p.id)));
    const items = results.map((r) => {
      const p = byId.get(r.id)!;
      return { rank: r.rank, reasons: r.reasons, project: { id: p.id, title: p.title, summary: p.summary, category: p.category, requiredSkills: p.requiredSkills, remoteOk: p.remoteOk, locationText: p.locationText } };
    });
    return Response.json({ items });
  } catch {
    return unavailable();
  }
}
