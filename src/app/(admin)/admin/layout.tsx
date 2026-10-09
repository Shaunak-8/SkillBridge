import { requireRole } from '@/lib/auth/profile';
export const dynamic = 'force-dynamic';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole('admin');
  return children;
}
