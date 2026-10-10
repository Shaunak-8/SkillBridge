import { getCommunityPost, getPostComments } from '@/lib/community/service';
import { currentProfile } from '@/lib/auth/profile';
import { CommunityPostDetail } from '@/components/community/CommunityPostDetail';

export const dynamic = 'force-dynamic';

export default async function BusinessPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const current = await currentProfile();
  const post = await getCommunityPost(postId);
  const comments = await getPostComments(postId);

  return (
    <CommunityPostDetail
      post={post}
      comments={comments}
      currentUserId={current?.profile?.id ?? null}
      role="business"
    />
  );
}
