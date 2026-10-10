import Link from "next/link";
import { Card, SectionTitle } from "@/components/ui";
import { QuizInvites } from "@/components/quiz/student/QuizInvites";
import { ApplicationStatusScope, LiveApplicationChatLink, LiveStatusActions, LiveStatusBadge } from "@/components/ws5/status-scope";
import { DbError, EmptyState } from "@/components/ws5/parts";
import type { ApplicationStatus } from "@/lib/applications/status";
import { currentProfile } from "@/lib/auth/profile";
import { TeamInvites } from "@/components/teams/TeamInvites";
import { TeamRoster } from "@/components/teams/TeamRoster";
import { listMyInvites, teamsForApplications } from "@/lib/teams/repo";
import { listApplicationsForProfile } from "@/lib/ws5/repo";

export const dynamic = "force-dynamic";

async function Applications() {
  let items: Awaited<ReturnType<typeof listApplicationsForProfile>>['items'];
  let teams: Awaited<ReturnType<typeof teamsForApplications>>;
  try {
    const profileId = (await currentProfile())?.profile?.id;
    items = profileId ? (await listApplicationsForProfile(profileId, { page: 1, pageSize: 50 }, true)).items : [];
    teams = await teamsForApplications(items.filter((a) => a.team_id).map((a) => a.id));
  } catch { return <DbError />; }
    if (!items.length) return <EmptyState>You have not applied to any projects yet. <Link href="/projects" className="font-semibold text-brand">Browse projects</Link></EmptyState>;
    return <div className="space-y-4">{items.map((a) => {
      const team = teams.get(a.id);
      // Teammates see the application; only the applicant (the team leader) can withdraw or chat with the business.
      const isApplicant = a.is_applicant !== false;
      return <ApplicationStatusScope key={a.id} applicationId={a.id} status={a.status as ApplicationStatus} actor="applicant"><Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/projects/${a.project_id}`} className="text-lg font-bold hover:text-brand">{a.project_title}</Link><p className="text-xs text-muted">{a.project_category} · Applied {new Date(a.created_at).toLocaleDateString("en-GB")}{team && ` · Team: ${team.name}`}</p></div><LiveStatusBadge /></div>
        <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-muted">{a.cover_note}</p>
        {team && <div className="mt-4"><TeamRoster members={team.members} /></div>}
        {isApplicant && <LiveStatusActions />}
        {isApplicant && <LiveApplicationChatLink applicationId={a.id} projectActive={['published', 'in_progress', 'completed'].includes(a.project_status)} />}
        {!isApplicant && <p className="mt-3 text-xs font-semibold text-muted">Your team leader manages this application.</p>}
      </Card></ApplicationStatusScope>;
    })}</div>;
}

async function Invites() {
  let invites: Awaited<ReturnType<typeof listMyInvites>> = [];
  try {
    const profileId = (await currentProfile())?.profile?.id;
    if (profileId) invites = await listMyInvites(profileId);
  } catch { /* invitations are optional here; the applications list reports database problems */ }
  return <TeamInvites invites={invites} />;
}

export default function Page() {
  return <><SectionTitle title="My applications" description="Track every project you have applied to. Businesses make the final decision." /><Invites /><QuizInvites /><Applications /></>;
}
