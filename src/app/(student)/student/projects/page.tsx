import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SkillBadge } from "@/components/shared/ProjectCard";
import { DbError, EmptyState, WhyMatch } from "@/components/ws5/parts";
import { currentProfile } from "@/lib/auth/profile";
import { recommendProjectsForStudent } from "@/lib/matching/rank";
import { loadPublishedProjects, loadStudentByProfile } from "@/lib/ws5/repo";

export const dynamic = "force-dynamic";

async function Recommended() {
  try {
    const profileId = (await currentProfile())?.profile?.id;
    const student = profileId ? await loadStudentByProfile(profileId) : null;
    if (!student) return <EmptyState>Complete your student profile to get recommendations. <Link href="/student/profile" className="font-semibold text-brand">Open profile</Link></EmptyState>;
    const projects = await loadPublishedProjects();
    const byId = new Map(projects.map((p) => [p.id, p]));
    // Own view: private visibility must not hide results from the student themselves.
    const results = recommendProjectsForStudent({ ...student, visibility: "matching" }, projects);
    if (!results.length) return <EmptyState>No matching projects yet. Add skills and portfolio items to your profile, or <Link href="/projects" className="font-semibold text-brand">browse all projects</Link>.</EmptyState>;
    return <div className="grid gap-5 md:grid-cols-2">{results.map((r) => {
      const p = byId.get(r.id)!;
      return <Card key={p.id} className="flex flex-col p-5">
        <div className="mb-3 flex gap-2"><Badge>{p.category}</Badge>{p.remoteOk && <Badge tone="green">Remote OK</Badge>}</div>
        <h3 className="text-lg font-bold">{p.title}</h3><p className="mt-2 line-clamp-2 text-sm text-muted">{p.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2">{p.requiredSkills.slice(0, 4).map((s) => <SkillBadge key={s} name={s} />)}</div>
        <WhyMatch reasons={r.reasons} />
        <Link href={`/projects/${p.id}`} className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm font-semibold text-brand">View project <ArrowUpRight size={16} /></Link>
      </Card>;
    })}</div>;
  } catch { return <DbError />; }
}

export default function Page() {
  return <DashboardLayout role="student"><SectionTitle title="Recommended for you" description="Projects that fit your skills, portfolio and availability. Each suggestion shows the profile details it is based on." /><Recommended /></DashboardLayout>;
}
