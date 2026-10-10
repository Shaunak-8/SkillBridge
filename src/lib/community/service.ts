import 'server-only';
import { database } from '@/lib/db';
import { requireRole } from '@/lib/auth/profile';

export type CommunityType = 'student' | 'business';

// Enforce that the user can only access their own community type
async function authorizeCommunityAccess(communityType: CommunityType) {
  const current = await requireRole(communityType);
  return current;
}

export async function getCommunityPosts(communityType: CommunityType, page = 1, limit = 20) {
  await authorizeCommunityAccess(communityType);
  const offset = (page - 1) * limit;

  const rows = await database()`
    SELECT
      p.id, p.author_id, p.community_type, p.title, p.body, p.category, p.tags, p.created_at, p.updated_at,
      u.full_name as author_name, u.avatar_url as author_avatar,
      COALESCE(c.comment_count, 0) as comment_count,
      COALESCE(r.like_count, 0) as like_count
    FROM skillbridge.community_posts p
    JOIN skillbridge.profiles u ON p.author_id = u.id
    LEFT JOIN (
      SELECT post_id, COUNT(*) as comment_count 
      FROM skillbridge.community_comments 
      WHERE deleted_at IS NULL 
      GROUP BY post_id
    ) c ON p.id = c.post_id
    LEFT JOIN (
      SELECT post_id, COUNT(*) as like_count 
      FROM skillbridge.community_reactions 
      WHERE reaction_type = 'like' 
      GROUP BY post_id
    ) r ON p.id = r.post_id
    WHERE p.community_type = ${communityType} AND p.deleted_at IS NULL
    ORDER BY p.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return rows;
}

export async function getCommunityPost(communityType: CommunityType, postId: string) {
  await authorizeCommunityAccess(communityType);

  const rows = await database()`
    SELECT
      p.id, p.author_id, p.community_type, p.title, p.body, p.category, p.tags, p.created_at, p.updated_at,
      u.full_name as author_name, u.avatar_url as author_avatar
    FROM skillbridge.community_posts p
    JOIN skillbridge.profiles u ON p.author_id = u.id
    WHERE p.id = ${postId} AND p.community_type = ${communityType} AND p.deleted_at IS NULL
  `;
  
  if (rows.length === 0) return null;
  return rows[0];
}

export async function createCommunityPost(
  communityType: CommunityType,
  title: string,
  body: string,
  category: string,
  tags: string[] = []
) {
  const current = await authorizeCommunityAccess(communityType);
  
  const rows = await database()`
    INSERT INTO skillbridge.community_posts (author_id, community_type, title, body, category, tags)
    VALUES (${current.profile.id}, ${communityType}, ${title}, ${body}, ${category}, ${tags})
    RETURNING id
  `;
  return rows[0].id;
}

export async function deleteCommunityPost(communityType: CommunityType, postId: string) {
  const current = await authorizeCommunityAccess(communityType);
  
  // Can only delete own post
  const rows = await database()`
    UPDATE skillbridge.community_posts
    SET deleted_at = now()
    WHERE id = ${postId} AND author_id = ${current.profile.id} AND community_type = ${communityType}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function getPostComments(communityType: CommunityType, postId: string) {
  await authorizeCommunityAccess(communityType);
  
  // Ensure post belongs to the right community before fetching comments
  const post = await database()`SELECT id FROM skillbridge.community_posts WHERE id = ${postId} AND community_type = ${communityType}`;
  if (post.length === 0) return [];

  const rows = await database()`
    SELECT
      c.id, c.post_id, c.author_id, c.parent_comment_id, c.body, c.created_at,
      u.full_name as author_name, u.avatar_url as author_avatar
    FROM skillbridge.community_comments c
    JOIN skillbridge.profiles u ON c.author_id = u.id
    WHERE c.post_id = ${postId} AND c.deleted_at IS NULL
    ORDER BY c.created_at ASC
  `;
  return rows;
}

export async function addComment(communityType: CommunityType, postId: string, body: string, parentCommentId: string | null = null) {
  const current = await authorizeCommunityAccess(communityType);
  
  // Check post community type
  const post = await database()`SELECT id FROM skillbridge.community_posts WHERE id = ${postId} AND community_type = ${communityType}`;
  if (post.length === 0) throw new Error("Post not found in this community");

  const rows = await database()`
    INSERT INTO skillbridge.community_comments (post_id, author_id, parent_comment_id, body)
    VALUES (${postId}, ${current.profile.id}, ${parentCommentId}, ${body})
    RETURNING id
  `;
  return rows[0].id;
}

export async function deleteComment(communityType: CommunityType, commentId: string) {
  const current = await authorizeCommunityAccess(communityType);
  
  const rows = await database()`
    UPDATE skillbridge.community_comments c
    SET deleted_at = now()
    FROM skillbridge.community_posts p
    WHERE c.id = ${commentId} 
      AND c.author_id = ${current.profile.id} 
      AND c.post_id = p.id 
      AND p.community_type = ${communityType}
    RETURNING c.id
  `;
  return rows.length > 0;
}

export async function toggleReaction(communityType: CommunityType, postId: string) {
  const current = await authorizeCommunityAccess(communityType);
  
  const post = await database()`SELECT id FROM skillbridge.community_posts WHERE id = ${postId} AND community_type = ${communityType}`;
  if (post.length === 0) throw new Error("Post not found in this community");

  const existing = await database()`SELECT id FROM skillbridge.community_reactions WHERE post_id = ${postId} AND user_id = ${current.profile.id} AND reaction_type = 'like'`;
  
  if (existing.length > 0) {
    await database()`DELETE FROM skillbridge.community_reactions WHERE id = ${existing[0].id}`;
    return false; // unliked
  } else {
    await database()`INSERT INTO skillbridge.community_reactions (post_id, user_id, reaction_type) VALUES (${postId}, ${current.profile.id}, 'like')`;
    return true; // liked
  }
}
