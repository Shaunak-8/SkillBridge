import { notFound } from "next/navigation";
import { Badge, Card, SectionTitle } from "@/components/ui";
import Link from "next/link";
import { businessPage } from "@/lib/business/pages";
import { SkillBadge } from "@/components/shared/ProjectCard";
import { ApplicationStatusScope, LiveApplicationChatLink, LiveStatusActions, LiveStatusBadge } from "@/components/ws5/status-scope";
import { DbError, EmptyState, WhyMatch } from "@/components/ws5/parts";
import { QuizPanel } from "@/components/quiz/business/QuizPanel";
import type { ApplicationStatus } from "@/lib/applications/status";
import { isEligible, recommendStudentsForProject } from "@/lib/matching/rank";
import { isUuid } from "@/lib/ws5/guard";
import { listProjectApplications, loadProjectRecommendationInput } from "@/lib/ws5/repo";
import { teamsForApplications } from "@/lib/teams/repo";
import { TeamRoster } from "@/components/teams/TeamRoster";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  let project, apps, suggestions, retriever, teams;
  try {
    const { owner: profileId } = await businessPage();
    // One parallel round trip; the applications are only used after the owner check passed.
    const [input, applications] = await Promise.all([loadProjectRecommendationInput(id, profileId), listProjectApplications(id, { page: 1, pageSize: 50 })]);
    if (input.kind !== "ok") notFound();
    const { students } = input;
    project = input.project;
    retriever = input.retriever;
    apps = applications;
    teams = await teamsForApplications(apps.items.map((a) => a.id));
    const applied = new Set(apps.items.map((a) => a.student.id));
    const byId = new Map(students.map((s) => [s.id, s]));
    suggestions = recommendStudentsForProject(project, students, {}, retriever).filter((r) => !applied.has(r.id)).map((r) => ({ ...r, student: byId.get(r.id)! }));
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_")) throw e; // let notFound() through
    return <DbError />;
  }

  return <>
    <SectionTitle eyebrow={project.title} title="Applications" description="Review applicants and decide who to move forward. Suggestions are a starting point - you make the final decision." />
    <Link href={`/business/projects/${id}`} className="mb-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand">Back to project</Link>
    <QuizPanel projectId={id} />
    {apps.total > 50 && <p className="mb-4 text-sm text-muted">Showing the 50 most recent applications.</p>}
    {apps.items.length === 0 ? <EmptyState>No applications yet.</EmptyState> : <div className="space-y-4">{apps.items.map((a) => {
      const ev = isEligible(project, { ...a.student, visibility: "matching" }) ? recommendStudentsForProject(project, [{ ...a.student, visibility: "matching" }], {}, retriever)[0] : undefined;
      const team = teams.get(a.id);
      return <ApplicationStatusScope key={a.id} applicationId={a.id} status={a.status as ApplicationStatus} actor="business_owner"><Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{a.student.displayName}</h3><p className="text-xs text-muted">Applied {new Date(a.createdAt).toLocaleDateString("en-GB")}{a.student.availabilityHoursPerWeek != null && ` · ${a.student.availabilityHoursPerWeek} hrs/week`}</p></div><LiveStatusBadge /></div>
        <p className="mt-3 whitespace-pre-line text-sm leading-6">{a.coverNote}</p>
        {a.student.skills.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{a.student.skills.map((s) => <SkillBadge key={s} name={s} />)}</div>}
        {team && <div className="mt-4"><p className="mb-2 text-sm font-bold">Team application: {team.name}</p><TeamRoster members={team.members} /></div>}
        <WhyMatch reasons={ev?.reasons ?? []} />
        <div className="mt-5 flex gap-2 items-center flex-wrap">
          <Link href={`/business/projects/${id}/applicants/${a.id}`} className="inline-flex h-9 items-center justify-center rounded-xl bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-dark">View Application</Link>
          <LiveStatusActions />
          <LiveApplicationChatLink applicationId={a.id} projectActive={['published', 'in_progress', 'completed'].includes(project.status)} />
        </div>
      </Card></ApplicationStatusScope>;
    })}</div>}
    <h2 className="mb-1 mt-12 text-xl font-bold">Suggested candidates</h2>
    <p className="mb-4 text-sm text-muted">Students who opted in to matching and have not applied. Contact details stay private.</p>
    {suggestions.length === 0 ? <EmptyState>No suggestions right now.</EmptyState> : <div className="grid gap-4 md:grid-cols-2">{suggestions.map((s) => <Card key={s.id} className="p-5">
      <div className="flex items-center justify-between gap-2"><h3 className="font-bold">{s.student.displayName}</h3>{s.student.availabilityHoursPerWeek != null && <Badge>{s.student.availabilityHoursPerWeek} hrs/week</Badge>}</div>
      <div className="mt-3 flex flex-wrap gap-2">{s.student.skills.slice(0, 6).map((k) => <SkillBadge key={k} name={k} />)}</div>
      <WhyMatch reasons={s.reasons} />
    </Card>)}</div>}
  </>;
}
