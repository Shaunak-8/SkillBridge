import { database } from "@/lib/db";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminUsersView, type UserProfileRow } from "@/components/admin/AdminUsersView";

export const dynamic = 'force-dynamic';

export default async function Page() {
  const rows = await database()`SELECT id, auth_user_id, username, email, full_name, avatar_url, role, onboarding_completed, created_at FROM skillbridge.profiles ORDER BY created_at DESC`;
  const users: UserProfileRow[] = rows.map((r) => ({
    id: r.id,
    auth_user_id: r.auth_user_id,
    username: r.username,
    email: r.email,
    full_name: r.full_name,
    avatar_url: r.avatar_url,
    role: r.role,
    onboarding_completed: Boolean(r.onboarding_completed),
    created_at: new Date(r.created_at).toISOString(),
  }));

  return (
    <DashboardLayout role="admin">
      <AdminUsersView users={users} />
    </DashboardLayout>
  );
}
