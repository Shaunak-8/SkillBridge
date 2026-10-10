import { getCommunityPost, getPostComments } from '@/lib/community/service';
import { CommunityPostDetail } from '@/components/community/CommunityPostDetail';

export default async function BusinessPostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  
  // Service enforces requireRole('business') and strictly queries community_type = 'business'
  const post = await getCommunityPost('business', postId);
  const comments = await getPostComments('business', postId);
  
  return <CommunityPostDetail type="business" post={post as any} comments={comments as any} />;
}
