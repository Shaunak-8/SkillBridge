import { getCommunityPosts } from '@/lib/community/service';
import { CommunityFeed } from '@/components/community/CommunityFeed';

export default async function StudentCommunityPage() {
  // Pass communityType='student'. Service will enforce requireRole('student')
  const posts = await getCommunityPosts('shared');
  
  // Convert plain objects if needed, but getCommunityPosts returns simple objects.
  return <CommunityFeed type="student" posts={posts} />;
}
