import { redirect } from 'next/navigation';
import { SectionTitle } from '@/components/ui';
import { BriefEditor } from '@/components/business/BriefEditor';
import { ownedProject } from '@/lib/business/pages';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const project = await ownedProject((await params).id);
  if (project.status !== 'draft') redirect(`/business/projects/${project.id}`);
  return <><SectionTitle title="Edit your project brief" description="You can save an unfinished draft and return to it later. Changes need a fresh confirmation." /><BriefEditor initial={project} editing /></>;
}
