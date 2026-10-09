import { ownedVerification, verificationQuestions, verificationError } from '@/lib/projects/verification';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { project } = await ownedVerification(id);
    return Response.json({ success: true, data: await verificationQuestions(id), briefVersion: project.brief_version });
  } catch (error) { return verificationError(error); }
}
