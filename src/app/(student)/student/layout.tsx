import { requireRole } from '@/lib/auth/profile';
export const dynamic = 'force-dynamic';
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireRole('student');
  return children;
}
