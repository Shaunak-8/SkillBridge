import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StudentDashboardView } from "@/components/student/StudentDashboardView";

export default function StudentDashboard() {
  return (
    <DashboardLayout role="student">
      <StudentDashboardView />
    </DashboardLayout>
  );
}
