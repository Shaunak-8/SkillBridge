import { requireRole } from '@/lib/auth/profile';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
export const dynamic = 'force-dynamic';
export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  await requireRole('business');
  return <DashboardLayout role="business"><div className="business-workspace">{children}</div></DashboardLayout>;
}
