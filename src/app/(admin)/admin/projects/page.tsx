import { DashboardLayout } from "@/components/layout/DashboardLayout"; import { RolePage } from "@/components/shared/RolePage";
export default function Page() { return <DashboardLayout role="admin"><RolePage role="admin" page="projects" /></DashboardLayout>; }
