import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PostProblemForm } from "./PostProblemForm";

export default function Page() {
  return (
    <DashboardLayout role="business">
      <PostProblemForm />
    </DashboardLayout>
  );
}
