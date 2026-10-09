import { notFound } from "next/navigation";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SkillBadge } from "@/components/shared/ProjectCard";
import { StatusActions } from "@/components/ws5/actions";
import { ApplicationStatusBadge, DbError, EmptyState, WhyMatch } from "@/components/ws5/parts";
import { allowedNextStatuses, type ApplicationStatus } from "@/lib/applications/status";
import { currentProfile } from "@/lib/auth/profile";
import { isEligible, recommendStudentsForProject } from "@/lib/matching/rank";
import { isUuid } from "@/lib/ws5/guard";
import { listProjectApplications, loadProject, loadRecommendableStudents } from "@/lib/ws5/repo";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  let project, apps, suggestions;
  try {
    const profileId = (await currentProfile())?.profile?.id;
    project = await loadProject(id);
    if (!project || project.ownerProfileId !== profileId) notFound();
    apps = await listProjectApplications(id, { page: 1, pageSize: 50 });
    const students = await loadRecommendableStudents();
    const applied = new Set(apps.items.map((a) => a.student.id));
    const byId = new Map(students.map((s) => [s.id, s]));
    suggestions = recommendStudentsForProject(project, students).filter((r) => !applied.has(r.id)).map((r) => ({ ...r, student: byId.get(r.id)! }));
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_")) throw e; // let notFound() through
    return <DashboardLayout role="business"><DbError /></DashboardLayout>;
  }

  return <DashboardLayout role="business">
    <SectionTitle eyebrow={project.title} title="Applications" description="Review applicants and decide who to move forward. Suggestions are a starting point - you make the final decision." />
    {apps.items.length === 0 ? <EmptyState>No applications yet.</EmptyState> : <div className="space-y-4">{apps.items.map((a) => {
      const ev = isEligible(project, { ...a.student, visibility: "matching" }) ? recommendStudentsForProject(project, [{ ...a.student, visibility: "matching" }])[0] : undefined;
      return <Card key={a.id} className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{a.student.displayName}</h3><p className="text-xs text-muted">Applied {new Date(a.createdAt).toLocaleDateString("en-GB")}{a.student.availabilityHoursPerWeek != null && ` · ${a.student.availabilityHoursPerWeek} hrs/week`}</p></div><ApplicationStatusBadge status={a.status} /></div>
        <p className="mt-3 whitespace-pre-line text-sm leading-6">{a.coverNote}</p>
        {a.student.skills.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{a.student.skills.map((s) => <SkillBadge key={s} name={s} />)}</div>}
        <WhyMatch reasons={ev?.reasons ?? []} />
        <StatusActions applicationId={a.id} next={[...allowedNextStatuses(a.status as ApplicationStatus, "business_owner")]} />
      </Card>;
    })}</div>}
    <h2 className="mb-1 mt-12 text-xl font-bold">Suggested candidates</h2>
    <p className="mb-4 text-sm text-muted">Students who opted in to matching and have not applied. Contact details stay private.</p>
    {suggestions.length === 0 ? <EmptyState>No suggestions right now.</EmptyState> : <div className="grid gap-4 md:grid-cols-2">{suggestions.map((s) => <Card key={s.id} className="p-5">
      <div className="flex items-center justify-between gap-2"><h3 className="font-bold">{s.student.displayName}</h3>{s.student.availabilityHoursPerWeek != null && <Badge>{s.student.availabilityHoursPerWeek} hrs/week</Badge>}</div>
      <div className="mt-3 flex flex-wrap gap-2">{s.student.skills.slice(0, 6).map((k) => <SkillBadge key={k} name={k} />)}</div>
      <WhyMatch reasons={s.reasons} />
    </Card>)}</div>}
  </DashboardLayout>;
}
