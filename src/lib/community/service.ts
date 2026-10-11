import 'server-only';
import { database } from '@/lib/db';
import { currentProfile } from '@/lib/auth/profile';

export type CommunityType = 'student' | 'business';
export type CommunityScope = CommunityType | 'shared';

export interface CommunityPost {
  id: string;
  author_id: string;
  author_role: 'student' | 'business' | string;
  author_name: string;
  author_avatar: string | null;
  community_type: string;
  title: string;
  body: string;
  category: string;
  tags: string[] | null;
  project_id: string | null;
  project_title: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  comment_count: number;
  upvote_count: number;
  downvote_count: number;
  vote_score: number;
  user_vote: number; // 1 (upvoted), -1 (downvoted), 0 (none)
  like_count?: number; // legacy backward compatibility
}

export interface CommunityComment {
  id: string;
  post_id: string;
  author_id: string;
  author_role: 'student' | 'business' | string;
  parent_comment_id: string | null;
  body: string;
  created_at: string | Date;
  author_name: string;
  author_avatar: string | null;
}

export interface CommunityFilterOptions {
  category?: string;
  authorRole?: string;
  sort?: 'latest' | 'top' | 'trending' | 'most_discussed';
  search?: string;
  page?: number;
  limit?: number;
  scope?: CommunityScope;
}

export interface VoteResult {
  vote_score: number;
  upvote_count: number;
  downvote_count: number;
  user_vote: number;
}

function escapeLike(text: string): string {
  return text.replace(/[%_\\]/g, '\\$&');
}

export async function getCommunityPosts(
  optionsOrScope: CommunityScope | CommunityFilterOptions = 'shared',
  pageArg = 1,
  limitArg = 50
): Promise<CommunityPost[]> {
  const options: CommunityFilterOptions = typeof optionsOrScope === 'string'
    ? { scope: optionsOrScope, page: pageArg, limit: limitArg }
    : optionsOrScope;

  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 50));
  const offset = (page - 1) * limit;

  const current = await currentProfile().catch(() => null);
  const currentUserId = current?.profile?.id ?? null;

  // Role filter: 'student' | 'business' | null
  const authorRoleFilter =
    options.authorRole && options.authorRole !== 'all'
      ? options.authorRole.toLowerCase()
      : options.scope && options.scope !== 'shared'
      ? options.scope.toLowerCase()
      : null;

  // Category filter
  let categoryPattern: string | null = null;
  if (options.category && options.category !== 'all' && options.category !== 'All Posts') {
    const cat = options.category.toLowerCase();
    if (cat.includes('question')) {
      categoryPattern = '%question%';
    } else if (cat.includes('completed') || cat.includes('outcome')) {
      categoryPattern = '%completed%';
    } else if (cat.includes('achievement')) {
      categoryPattern = '%achievement%';
    } else if (cat.includes('update') || cat.includes('review')) {
      categoryPattern = '%update%';
    } else {
      categoryPattern = `%${escapeLike(options.category)}%`;
    }
  }

  // Search filter
  const q = options.search?.trim() || null;
  const searchPattern = q ? `%${escapeLike(q)}%` : null;

  const sort = options.sort || 'latest';

  const rows = await database()`
    SELECT
      p.id,
      p.author_id,
      p.community_type,
      p.title,
      p.body,
      p.category,
      p.tags,
      p.project_id,
      p.created_at,
      p.updated_at,
      u.full_name AS author_name,
      u.avatar_url AS author_avatar,
      COALESCE(u.role, p.community_type, 'student') AS author_role,
      proj.title AS project_title,
      COALESCE(c.comment_count, 0)::int AS comment_count,
      COALESCE(v.upvote_count, r.like_count, 0)::int AS upvote_count,
      COALESCE(v.downvote_count, 0)::int AS downvote_count,
      COALESCE(v.vote_score, r.like_count, 0)::int AS vote_score,
      COALESCE(uv.vote_value, ur.has_liked, 0)::int AS user_vote
    FROM skillbridge.community_posts p
    JOIN skillbridge.profiles u ON p.author_id = u.id
    LEFT JOIN skillbridge.projects proj ON p.project_id = proj.id
    LEFT JOIN (
      SELECT post_id, COUNT(*)::int AS comment_count
      FROM skillbridge.community_comments
      WHERE deleted_at IS NULL
      GROUP BY post_id
    ) c ON p.id = c.post_id
    LEFT JOIN (
      SELECT
        post_id,
        COUNT(*) FILTER (WHERE vote_value = 1)::int AS upvote_count,
        COUNT(*) FILTER (WHERE vote_value = -1)::int AS downvote_count,
        COALESCE(SUM(vote_value), 0)::int AS vote_score
      FROM skillbridge.community_votes
      GROUP BY post_id
    ) v ON p.id = v.post_id
    LEFT JOIN (
      SELECT post_id, COUNT(*)::int AS like_count
      FROM skillbridge.community_reactions
      WHERE reaction_type = 'like'
      GROUP BY post_id
    ) r ON p.id = r.post_id
    LEFT JOIN skillbridge.community_votes uv ON uv.post_id = p.id AND uv.user_id = ${currentUserId || '00000000-0000-0000-0000-000000000000'}
    LEFT JOIN (
      SELECT post_id, 1 AS has_liked
      FROM skillbridge.community_reactions
      WHERE user_id = ${currentUserId || '00000000-0000-0000-0000-000000000000'} AND reaction_type = 'like'
    ) ur ON ur.post_id = p.id
    WHERE p.deleted_at IS NULL
      AND (${authorRoleFilter}::text IS NULL OR u.role = ${authorRoleFilter} OR p.community_type = ${authorRoleFilter})
      AND (${categoryPattern}::text IS NULL OR p.category ILIKE ${categoryPattern})
      AND (${searchPattern}::text IS NULL OR (p.title ILIKE ${searchPattern} OR p.body ILIKE ${searchPattern}))
    ORDER BY
      CASE WHEN ${sort} = 'top' THEN COALESCE(v.vote_score, r.like_count, 0) END DESC NULLS LAST,
      CASE WHEN ${sort} = 'trending' THEN
        (COALESCE(v.vote_score, r.like_count, 0) * 2 + COALESCE(c.comment_count, 0) * 3 + 1)::float /
        POW((EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600.0 + 2), 1.2)
      END DESC NULLS LAST,
      CASE WHEN ${sort} = 'most_discussed' THEN COALESCE(c.comment_count, 0) END DESC NULLS LAST,
      p.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return rows as CommunityPost[];
}

export async function getCommunityPost(
  scopeOrPostId: CommunityScope | string,
  maybePostId?: string
): Promise<CommunityPost | null> {
  const postId = maybePostId || (scopeOrPostId as string);
  const current = await currentProfile().catch(() => null);
  const currentUserId = current?.profile?.id ?? null;

  const rows = await database()`
    SELECT
      p.id,
      p.author_id,
      p.community_type,
      p.title,
      p.body,
      p.category,
      p.tags,
      p.project_id,
      p.created_at,
      p.updated_at,
      u.full_name AS author_name,
      u.avatar_url AS author_avatar,
      COALESCE(u.role, p.community_type, 'student') AS author_role,
      proj.title AS project_title,
      COALESCE(c.comment_count, 0)::int AS comment_count,
      COALESCE(v.upvote_count, r.like_count, 0)::int AS upvote_count,
      COALESCE(v.downvote_count, 0)::int AS downvote_count,
      COALESCE(v.vote_score, r.like_count, 0)::int AS vote_score,
      COALESCE(uv.vote_value, ur.has_liked, 0)::int AS user_vote
    FROM skillbridge.community_posts p
    JOIN skillbridge.profiles u ON p.author_id = u.id
    LEFT JOIN skillbridge.projects proj ON p.project_id = proj.id
    LEFT JOIN (
      SELECT post_id, COUNT(*)::int AS comment_count
      FROM skillbridge.community_comments
      WHERE deleted_at IS NULL
      GROUP BY post_id
    ) c ON p.id = c.post_id
    LEFT JOIN (
      SELECT
        post_id,
        COUNT(*) FILTER (WHERE vote_value = 1)::int AS upvote_count,
        COUNT(*) FILTER (WHERE vote_value = -1)::int AS downvote_count,
        COALESCE(SUM(vote_value), 0)::int AS vote_score
      FROM skillbridge.community_votes
      GROUP BY post_id
    ) v ON p.id = v.post_id
    LEFT JOIN (
      SELECT post_id, COUNT(*)::int AS like_count
      FROM skillbridge.community_reactions
      WHERE reaction_type = 'like'
      GROUP BY post_id
    ) r ON p.id = r.post_id
    LEFT JOIN skillbridge.community_votes uv ON uv.post_id = p.id AND uv.user_id = ${currentUserId || '00000000-0000-0000-0000-000000000000'}
    LEFT JOIN (
      SELECT post_id, 1 AS has_liked
      FROM skillbridge.community_reactions
      WHERE user_id = ${currentUserId || '00000000-0000-0000-0000-000000000000'} AND reaction_type = 'like'
    ) ur ON ur.post_id = p.id
    WHERE p.id = ${postId} AND p.deleted_at IS NULL
  `;

  if (rows.length === 0) return null;
  return rows[0] as CommunityPost;
}

export async function createCommunityPost(
  communityTypeOrTitle: CommunityType | string,
  titleOrBody: string,
  bodyOrCategory: string,
  categoryOrTags: string | string[] = 'General Discussion',
  tagsOrProjectId: string[] | string | null = [],
  maybeProjectId: string | null = null
): Promise<string> {
  const current = await currentProfile();
  if (!current?.profile) {
    throw new Error('Authentication required to create a post');
  }

  let title: string;
  let body: string;
  let category: string;
  let tags: string[] = [];
  let projectId: string | null = null;

  // Handle both signatures:
  // 1. (communityType, title, body, category, tags)
  // 2. (title, body, category, tags, projectId)
  if (communityTypeOrTitle === 'student' || communityTypeOrTitle === 'business') {
    title = titleOrBody;
    body = bodyOrCategory;
    category = typeof categoryOrTags === 'string' ? categoryOrTags : 'General Discussion';
    tags = Array.isArray(tagsOrProjectId) ? tagsOrProjectId : [];
    projectId = maybeProjectId;
  } else {
    title = communityTypeOrTitle;
    body = titleOrBody;
    category = bodyOrCategory;
    tags = Array.isArray(categoryOrTags) ? categoryOrTags : [];
    projectId = typeof tagsOrProjectId === 'string' ? tagsOrProjectId : null;
  }

  const role = current.profile.role === 'business' ? 'business' : 'student';

  // Validate project association if provided
  let validProjectId: string | null = null;
  if (projectId) {
    const projCheck = await database()`
      SELECT id FROM skillbridge.projects WHERE id = ${projectId}
    `;
    if (projCheck.length > 0) {
      validProjectId = projectId;
    }
  }

  const rows = await database()`
    INSERT INTO skillbridge.community_posts (
      author_id, community_type, title, body, category, tags, project_id
    ) VALUES (
      ${current.profile.id}, ${role}, ${title}, ${body}, ${category}, ${tags}, ${validProjectId}
    )
    RETURNING id
  `;

  return rows[0].id as string;
}

export async function updateCommunityPost(
  postId: string,
  title: string,
  body: string,
  category: string
): Promise<boolean> {
  const current = await currentProfile();
  if (!current?.profile) {
    throw new Error('Authentication required');
  }

  const rows = await database()`
    UPDATE skillbridge.community_posts
    SET title = ${title}, body = ${body}, category = ${category}, updated_at = now()
    WHERE id = ${postId} AND author_id = ${current.profile.id} AND deleted_at IS NULL
    RETURNING id
  `;
  return rows.length > 0;
}

export async function deleteCommunityPost(
  scopeOrPostId: CommunityType | string,
  maybePostId?: string
): Promise<boolean> {
  const current = await currentProfile();
  if (!current?.profile) {
    throw new Error('Authentication required');
  }

  const postId = maybePostId || (scopeOrPostId as string);

  const rows = await database()`
    UPDATE skillbridge.community_posts
    SET deleted_at = now()
    WHERE id = ${postId}
      AND (author_id = ${current.profile.id} OR ${current.profile.role === 'admin'})
    RETURNING id
  `;
  return rows.length > 0;
}

export async function getPostComments(
  scopeOrPostId: CommunityScope | string,
  maybePostId?: string
): Promise<CommunityComment[]> {
  const postId = maybePostId || (scopeOrPostId as string);

  const rows = await database()`
    SELECT
      c.id,
      c.post_id,
      c.author_id,
      c.parent_comment_id,
      c.body,
      c.created_at,
      u.full_name AS author_name,
      u.avatar_url AS author_avatar,
      COALESCE(u.role, 'student') AS author_role
    FROM skillbridge.community_comments c
    JOIN skillbridge.profiles u ON c.author_id = u.id
    WHERE c.post_id = ${postId} AND c.deleted_at IS NULL
    ORDER BY c.created_at ASC
  `;

  return rows as CommunityComment[];
}

export async function addComment(
  scopeOrPostId: CommunityScope | string,
  postIdOrBody: string,
  bodyOrParent?: string | null,
  maybeParent: string | null = null
): Promise<string> {
  const current = await currentProfile();
  if (!current?.profile) {
    throw new Error('Authentication required to comment');
  }

  let postId: string;
  let body: string;
  let parentCommentId: string | null = null;

  if (scopeOrPostId === 'student' || scopeOrPostId === 'business' || scopeOrPostId === 'shared') {
    postId = postIdOrBody;
    body = bodyOrParent || '';
    parentCommentId = maybeParent;
  } else {
    postId = scopeOrPostId;
    body = postIdOrBody;
    parentCommentId = bodyOrParent ?? null;
  }

  if (!body.trim()) {
    throw new Error('Comment body is required');
  }

  const post = await database()`
    SELECT id FROM skillbridge.community_posts WHERE id = ${postId} AND deleted_at IS NULL
  `;
  if (post.length === 0) throw new Error('Post not found');

  const rows = await database()`
    INSERT INTO skillbridge.community_comments (post_id, author_id, parent_comment_id, body)
    VALUES (${postId}, ${current.profile.id}, ${parentCommentId}, ${body})
    RETURNING id
  `;
  return rows[0].id as string;
}

export async function deleteComment(
  scopeOrCommentId: CommunityType | string,
  maybeCommentId?: string
): Promise<boolean> {
  const current = await currentProfile();
  if (!current?.profile) {
    throw new Error('Authentication required');
  }

  const commentId = maybeCommentId || (scopeOrCommentId as string);

  const rows = await database()`
    UPDATE skillbridge.community_comments
    SET deleted_at = now()
    WHERE id = ${commentId}
      AND (author_id = ${current.profile.id} OR ${current.profile.role === 'admin'})
    RETURNING id
  `;
  return rows.length > 0;
}

export async function castVote(postId: string, voteValue: 1 | -1): Promise<VoteResult> {
  const current = await currentProfile();
  if (!current?.profile) {
    throw new Error('Authentication required to vote');
  }
  const userId = current.profile.id;

  const existing = await database()`
    SELECT id, vote_value FROM skillbridge.community_votes
    WHERE post_id = ${postId} AND user_id = ${userId}
  `;

  if (existing.length > 0) {
    const currentVote = Number(existing[0].vote_value);
    if (currentVote === voteValue) {
      // User clicked active vote direction again -> cancel vote
      await database()`
        DELETE FROM skillbridge.community_votes WHERE id = ${existing[0].id}
      `;
    } else {
      // User switched vote
      await database()`
        UPDATE skillbridge.community_votes
        SET vote_value = ${voteValue}, updated_at = now()
        WHERE id = ${existing[0].id}
      `;
    }
  } else {
    // Insert new vote
    await database()`
      INSERT INTO skillbridge.community_votes (post_id, user_id, vote_value)
      VALUES (${postId}, ${userId}, ${voteValue})
    `;
  }

  // Fetch updated counts
  const scoreRow = await database()`
    SELECT
      COALESCE(SUM(vote_value), 0)::int AS vote_score,
      COUNT(*) FILTER (WHERE vote_value = 1)::int AS upvote_count,
      COUNT(*) FILTER (WHERE vote_value = -1)::int AS downvote_count
    FROM skillbridge.community_votes
    WHERE post_id = ${postId}
  `;
  const userVoteRow = await database()`
    SELECT vote_value FROM skillbridge.community_votes
    WHERE post_id = ${postId} AND user_id = ${userId}
  `;

  return {
    vote_score: scoreRow[0]?.vote_score ?? 0,
    upvote_count: scoreRow[0]?.upvote_count ?? 0,
    downvote_count: scoreRow[0]?.downvote_count ?? 0,
    user_vote: userVoteRow[0]?.vote_value ?? 0,
  };
}

export async function toggleReaction(scopeOrPostId: CommunityScope | string, maybePostId?: string) {
  const postId = maybePostId || (scopeOrPostId as string);
  const result = await castVote(postId, 1);
  return result.user_vote === 1;
}

export async function getUserProjectsForComposer(): Promise<{ id: string; title: string }[]> {
  const current = await currentProfile().catch(() => null);
  if (!current?.profile) return [];

  try {
    if (current.profile.role === 'business') {
      const rows = await database()`
        SELECT id, title FROM skillbridge.projects
        WHERE owner_profile_id = ${current.profile.id}
        ORDER BY created_at DESC
        LIMIT 20
      `;
      return rows.map(r => ({ id: String(r.id), title: String(r.title) }));
    } else {
      const rows = await database()`
        SELECT DISTINCT p.id, p.title
        FROM skillbridge.projects p
        JOIN skillbridge.applications a ON a.project_id = p.id
        JOIN skillbridge.student_profiles sp ON sp.id = a.student_id
        WHERE sp.profile_id = ${current.profile.id}
        ORDER BY p.title ASC
        LIMIT 20
      `;
      return rows.map(r => ({ id: String(r.id), title: String(r.title) }));
    }
  } catch {
    return [];
  }
}
