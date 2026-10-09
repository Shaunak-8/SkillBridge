import { SectionTitle } from '@/components/ui';
import { BriefEditor } from '@/components/business/BriefEditor';
import { ownedProject } from '@/lib/business/pages';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const project = await ownedProject((await params).id);
  return <><SectionTitle title={project.title || 'Review your project brief'} description="Check the details before confirming and publishing." /><BriefEditor initial={project} /></>;
}
