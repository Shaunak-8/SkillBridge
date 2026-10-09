import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProjectCard } from '@/components/shared/ProjectCard';
import { SectionTitle } from '@/components/ui';
import { requireRole } from '@/lib/auth/profile';
import { ownedProjects } from '@/lib/projects/repository';
export default async function Page() {
  const current = await requireRole('business');
  const projects = await ownedProjects(current.profile.id);
  return <DashboardLayout role="business">
    <SectionTitle eyebrow="business" title="Your projects" description="Review your drafts and track your projects." />
    <div className="grid gap-5 md:grid-cols-2">{projects.map(project => <ProjectCard key={project.id} project={project} />)}</div>
    {!projects.length && <p className="text-muted">No projects yet. Create a draft to get started.</p>}
  </DashboardLayout>;
}
