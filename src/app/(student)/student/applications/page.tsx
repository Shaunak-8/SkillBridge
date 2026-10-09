import Link from "next/link";
import { Card, SectionTitle } from "@/components/ui";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { QuizInvites } from "@/components/quiz/student/QuizInvites";
import { ApplicationStatusScope, LiveStatusActions, LiveStatusBadge } from "@/components/ws5/status-scope";
import { DbError, EmptyState } from "@/components/ws5/parts";
import type { ApplicationStatus } from "@/lib/applications/status";
import { currentProfile } from "@/lib/auth/profile";
import { listApplicationsForProfile } from "@/lib/ws5/repo";

export const dynamic = "force-dynamic";

async function Applications() {
  try {
    const profileId = (await currentProfile())?.profile?.id;
    const { items } = profileId ? await listApplicationsForProfile(profileId, { page: 1, pageSize: 50 }) : { items: [] };
    if (!items.length) return <EmptyState>You have not applied to any projects yet. <Link href="/projects" className="font-semibold text-brand">Browse projects</Link></EmptyState>;
    return <div className="space-y-4">{items.map((a) => {
      return <ApplicationStatusScope key={a.id} applicationId={a.id} status={a.status as ApplicationStatus} actor="applicant"><Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/projects/${a.project_id}`} className="text-lg font-bold hover:text-brand">{a.project_title}</Link><p className="text-xs text-muted">{a.project_category} · Applied {new Date(a.created_at).toLocaleDateString("en-GB")}</p></div><LiveStatusBadge /></div>
        <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-muted">{a.cover_note}</p>
        <LiveStatusActions />
      </Card></ApplicationStatusScope>;
    })}</div>;
  } catch { return <DbError />; }
}

export default function Page() {
  return <DashboardLayout role="student"><SectionTitle title="My applications" description="Track every project you have applied to. Businesses make the final decision." /><QuizInvites /><Applications /></DashboardLayout>;
}
