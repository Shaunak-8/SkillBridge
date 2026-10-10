import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Every student page reads the session cookie; without this Next tries to prerender them and logs a "Dynamic server usage" error per page.
export const dynamic = 'force-dynamic';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="student">{children}</DashboardLayout>;
}
