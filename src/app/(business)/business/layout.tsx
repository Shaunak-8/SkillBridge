import { requireRole } from '@/lib/auth/profile';
export const dynamic = 'force-dynamic';
export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  await requireRole('business');
  return children;
}
