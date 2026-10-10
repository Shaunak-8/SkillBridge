import { getCommunityPost, getPostComments } from '@/lib/community/service';
import { CommunityPostDetail } from '@/components/community/CommunityPostDetail';

export default async function StudentPostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  
  // Service enforces requireRole('student') and strictly queries community_type = 'student'
  const post = await getCommunityPost('shared', postId);
  const comments = await getPostComments('shared', postId);
  
  return <CommunityPostDetail type="student" post={post} comments={comments} />;
}
