import Link from 'next/link';
import { FolderKanban, FilePenLine, Send, Users } from 'lucide-react';
import { SectionTitle } from '@/components/ui';
import { StatCard } from '@/components/shared/StatCard';
import { ProjectList, actionClass } from '@/components/business/ProjectList';
import { businessPage } from '@/lib/business/pages';
import { dashboardCounts, listProjects } from '@/lib/business/service';
export default async function Page() {
  const { owner, business } = await businessPage();
  const [counts, projects] = await Promise.all([dashboardCounts(owner), listProjects(owner)]);
  return <><div className="mb-6 flex flex-wrap items-start justify-between gap-4"><SectionTitle eyebrow="Business workspace" title={`Welcome back, ${business.business_name}!`} description="Manage your projects and find students who can help your business grow." /><Link href="/business/projects/new" className={actionClass}>Post a Problem</Link></div>
    <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Total Projects" value={String(counts.total)} detail="Your projects" icon={FolderKanban} /><StatCard label="Draft Projects" value={String(counts.drafts)} detail="Ready to continue" icon={FilePenLine} /><StatCard label="Published Projects" value={String(counts.published)} detail="Published briefs" icon={Send} /><StatCard label="Applications Received" value={String(counts.applications)} detail="Across your projects" icon={Users} /></div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Recent projects</h2><Link className="inline-flex min-h-11 items-center text-sm font-semibold text-brand" href="/business/projects">View all projects</Link></div><ProjectList projects={projects.slice(0, 6)} /></>;
}
