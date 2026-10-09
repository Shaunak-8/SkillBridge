import { redirect } from 'next/navigation';
import { ownedProject } from '@/lib/business/pages';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const project = await ownedProject((await params).id); redirect(`/business/projects/${project.id}`); }
