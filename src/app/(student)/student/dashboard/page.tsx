import { StudentDashboardView, type DashboardApplication } from "@/components/student/StudentDashboardView";
import { getMyProfile } from '@/lib/students/service';
import { listApplicationsForProfile } from '@/lib/ws5/repo';
import { requireRole } from '@/lib/auth/profile';

export default async function StudentDashboard() {
  const current = await requireRole('student');
  
  const [profile, applicationsRes] = await Promise.all([
    getMyProfile(current.profile.id),
    listApplicationsForProfile(current.profile.id, { page: 1, pageSize: 5 }),
  ]);

  return <StudentDashboardView
    profile={profile}
    applications={applicationsRes.items as unknown as DashboardApplication[]}
    portfolioItems={profile.portfolioItems ?? []}
  />;
}
