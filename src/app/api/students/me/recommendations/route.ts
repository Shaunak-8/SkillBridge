import { recommendProjectsForStudent } from '@/lib/matching/rank';
import { loadStudentRecommendationInput } from '@/lib/ws5/repo';
import { guard, unavailable } from '@/lib/ws5/guard';

export async function GET() {
  try {
    const auth = await guard('student');
    if (auth instanceof Response) return auth;
    const input = await loadStudentRecommendationInput(auth.profile.id);
    if (!input) return Response.json({ items: [] });
    const { student, projects, retriever } = input;
    const byId = new Map(projects.map((p) => [p.id, p]));
    // It is the student's own view, so their private visibility must not hide results from them.
    const results = recommendProjectsForStudent({ ...student, visibility: 'matching' }, projects, {}, retriever);
    const items = results.map((r) => {
      const p = byId.get(r.id)!;
      return { rank: r.rank, reasons: r.reasons, project: { id: p.id, title: p.title, summary: p.summary, category: p.category, requiredSkills: p.requiredSkills, remoteOk: p.remoteOk, locationText: p.locationText } };
    });
    return Response.json({ items });
  } catch {
    return unavailable();
  }
}
