import { Messages } from '@/components/chat/Messages';
import { currentProfile } from '@/lib/auth/profile';
import { applicationChatTarget } from '@/lib/chat/membership';
export default async function Page({ searchParams }: { searchParams: Promise<{ project?: string; application?: string }> }) {
  const [current, query] = await Promise.all([currentProfile(), searchParams]);
  const initialPeerUid = current?.profile?.id ? await applicationChatTarget(current.profile.id, query.project, query.application) : undefined;
  return <Messages initialPeerUid={initialPeerUid} />;
}
