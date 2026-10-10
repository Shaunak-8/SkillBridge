import { Messages } from '@/components/chat/Messages';
import { currentProfile } from '@/lib/auth/profile';
import { applicationChatTarget } from '@/lib/chat/membership';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
export default async function Page({ searchParams }: { searchParams: Promise<{ project?: string; application?: string }> }) {
  const [current, query] = await Promise.all([currentProfile(), searchParams]);
  const initialPeerUid = current?.profile?.id ? await applicationChatTarget(current.profile.id, query.project, query.application) : undefined;
  return <DashboardLayout role="student"><Messages initialPeerUid={initialPeerUid} /></DashboardLayout>;
}
