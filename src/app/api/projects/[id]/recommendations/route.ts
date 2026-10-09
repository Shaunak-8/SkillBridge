import { recommendStudentsForProject } from '@/lib/matching/rank';
import { candidateDto, loadProject, loadRecommendableStudents } from '@/lib/ws5/repo';
import { fail, guard, isUuid, unavailable } from '@/lib/ws5/guard';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return fail('Project not found.', 404);
  try {
    const auth = await guard('business');
    if (auth instanceof Response) return auth;
    const project = await loadProject(id);
    if (!project) return fail('Project not found.', 404);
    if (project.ownerProfileId !== auth.profile.id) return fail('You do not own this project.', 403);
    const students = await loadRecommendableStudents();
    const byId = new Map(students.map((s) => [s.id, s]));
    const items = recommendStudentsForProject(project, students).map((r) => ({
      rank: r.rank, reasons: r.reasons, candidate: candidateDto(byId.get(r.id)!),
    }));
    return Response.json({ items });
  } catch {
    return unavailable();
  }
}
