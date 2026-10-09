import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/profile';
import { database } from '@/lib/db';
import { projectBrief } from '@/lib/contracts';
import { verificationQuestions } from '@/lib/projects/verification';
import VerificationFlow from '@/components/projects/VerificationFlow';

export default async function VerifyProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const current = await requireRole('business');
  const { id } = await params;
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) notFound();
  const [project] = await database()`SELECT * FROM skillbridge.projects WHERE id = ${id} AND owner_profile_id = ${current.profile.id}`;
  if (!project) notFound();
  if (!['draft', 'published'].includes(project.status)) return <div className="p-8">Verification is locked because this project has started or closed.</div>;
  return <main className="mx-auto max-w-4xl px-6 py-12">
    <h1 className="mb-2 text-3xl font-bold">Review Project Brief</h1>
    <p className="mb-8 text-muted">Answer a few simple questions, correct the brief, and confirm the version that accurately describes your needs.</p>
    <VerificationFlow project={projectBrief(project)} questions={await verificationQuestions(id)} />
  </main>;
}
