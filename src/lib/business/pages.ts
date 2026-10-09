import 'server-only';
import { redirect, notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/profile';
import { getBusiness, getProject } from './service';
import { BusinessError, projectId } from './http';
export async function businessPage() {
  const { profile } = await requireRole('business');
  const business = await getBusiness(String(profile.id));
  if (!business) redirect('/business/onboarding');
  return { owner: String(profile.id), business };
}
export async function ownedProject(id: string) {
  const { owner } = await businessPage();
  try { return await getProject(owner, projectId(id)); }
  catch (error) { if (error instanceof BusinessError && error.status === 404) notFound(); throw error; }
}
