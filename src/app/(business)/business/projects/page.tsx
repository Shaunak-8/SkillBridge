import Link from 'next/link';
import { SectionTitle, Card } from '@/components/ui';
import { ProjectList, actionClass } from '@/components/business/ProjectList';
import { businessPage } from '@/lib/business/pages';
import { listProjects } from '@/lib/business/service';
import { statuses } from '@/lib/business/contracts';
export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { owner } = await businessPage();
  const { status } = await searchParams;
  const projects = await listProjects(owner);
  const filter = statuses.find(s => s === status);
  const filtered = filter ? projects.filter(p => p.status === filter) : projects;
  return <><div className="flex flex-wrap items-start justify-between gap-4"><SectionTitle title="My projects" description="Review drafts and keep track of your published projects." /><Link href="/business/projects/new" className={actionClass}>Post a Problem</Link></div>
    <nav aria-label="Filter projects" className="mb-6 flex flex-wrap gap-2">{['all', ...statuses].map(s => <Link key={s} aria-current={(filter ?? 'all') === s ? 'page' : undefined} href={s === 'all' ? '/business/projects' : `?status=${s}`} className={`inline-flex min-h-11 items-center rounded-xl border px-4 text-sm capitalize ${(filter ?? 'all') === s ? 'border-brand bg-brand-soft font-semibold text-brand-dark' : 'border-line bg-white text-muted'}`}>{s.replaceAll('_', ' ')}</Link>)}</nav>
    {filter && !filtered.length ? <Card className="p-8 text-center"><h2 className="text-lg font-bold">No {filter.replaceAll('_', ' ')} projects{filter === 'published' ? ' yet' : ''}.</h2><Link className="mt-4 inline-flex min-h-11 items-center text-brand" href="/business/projects">View all projects</Link></Card> : <ProjectList projects={filtered} />}
    {projects.length === 200 && <p className="mt-4 text-sm text-muted">Showing your 200 most recently updated projects.</p>}</>;
}
