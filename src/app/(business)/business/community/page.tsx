import { getCommunityPosts, getUserProjectsForComposer } from '@/lib/community/service';
import { currentProfile } from '@/lib/auth/profile';
import { CommunityPage } from '@/components/community/CommunityPage';

export const dynamic = 'force-dynamic';

export default async function BusinessCommunityPage() {
  const current = await currentProfile();
  const posts = await getCommunityPosts('shared');
  const userProjects = await getUserProjectsForComposer();

  return (
    <CommunityPage
      initialPosts={posts}
      currentUserId={current?.profile?.id ?? null}
      role="business"
      userProjects={userProjects}
    />
  );
}
