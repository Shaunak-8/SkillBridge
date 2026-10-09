import ProjectBoard from '@/components/shared/ProjectBoard';
import { publishedProjects } from '@/lib/projects/repository';
export const dynamic = 'force-dynamic';
export default async function ProjectsPage() {
  return <ProjectBoard projects={await publishedProjects(100)} />;
}
