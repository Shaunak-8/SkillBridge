import { recommendStudentsForProject } from '@/lib/matching/rank';
import { candidateDto, listProjectApplications, loadProject } from '@/lib/ws5/repo';
import { fail, guard, isUuid, pageParams, unavailable } from '@/lib/ws5/guard';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return fail('Project not found.', 404);
  try {
    const auth = await guard('business');
    if (auth instanceof Response) return auth;
    const project = await loadProject(id);
    if (!project) return fail('Project not found.', 404);
    if (project.ownerProfileId !== auth.profile.id) return fail('You do not own this project.', 403);
    const result = await listProjectApplications(id, pageParams(new URL(request.url)));
    // Applicants opted in by applying, so rank them regardless of visibility/remote preference.
    const ranked = new Map(recommendStudentsForProject(
      { ...project, status: 'published' },
      result.items.map((a) => ({ ...a.student, visibility: 'matching' as const, remotePreference: 'either' as const })),
      { k: result.items.length },
    ).map((r) => [r.id, r.reasons]));
    const items = result.items.map((a) => ({
      id: a.id, status: a.status, coverNote: a.coverNote, createdAt: a.createdAt,
      candidate: candidateDto(a.student), reasons: ranked.get(a.student.id) ?? [],
    }));
    return Response.json({ items, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch {
    return unavailable();
  }
}
