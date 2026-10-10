import { getCommunityPosts } from '@/lib/community/service';
import { CommunityFeed } from '@/components/community/CommunityFeed';

export default async function BusinessCommunityPage() {
  // Pass communityType='business'. Service will enforce requireRole('business')
  const posts = await getCommunityPosts('shared');
  
  return <CommunityFeed type="business" posts={posts} />;
}
