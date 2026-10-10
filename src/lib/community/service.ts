import 'server-only';
import { database } from '@/lib/db';
import { requireRole } from '@/lib/auth/profile';

export type CommunityType = 'student' | 'business';

export type PostType =
  | 'completed_project'
  | 'achievement'
  | 'project_update'
  | 'business_milestone'
  | 'general';

export interface CommunityAuthor {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  role: 'student' | 'business' | 'admin';
  headline?: string | null;
  organizationName?: string | null;
}

export interface CommunityAttachedProject {
  id: string;
  title: string;
  category: string;
  status: string;
}

export interface CommunityPost {
  id: string;
  authorProfileId: string;
  postType: PostType;
  title: string;
  content: string;
  projectId: string | null;
  mediaUrls: string[];
  skillsHighlighted: string[];
  createdAt: string;
  updatedAt: string;
  author: CommunityAuthor;
  project?: CommunityAttachedProject | null;
  likesCount: number;
  commentsCount: number;
  hasLiked?: boolean;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorProfileId: string;
  content: string;
  createdAt: string;
  author: CommunityAuthor;
}

// In-memory fallback store for when database is offline or in local demo mode without PostgreSQL
const fallbackPosts: CommunityPost[] = [
  {
    id: 'post-seed-1',
    authorProfileId: 'author-student-1',
    postType: 'completed_project',
    title: 'Completed Inventory Automation for FreshFoods Market!',
    content:
      'Just delivered a full barcode scanning & inventory replenishment system for FreshFoods Market in Pune! We integrated WhatsApp alerts for low-stock items and reduced stockouts by 35%. Huge thanks to Mr. Sharma for the great mentorship throughout the 3-week project.',
    projectId: null,
    mediaUrls: [],
    skillsHighlighted: ['Next.js', 'PostgreSQL', 'Tailwind CSS', 'WhatsApp Business API'],
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    author: {
      id: 'author-student-1',
      fullName: 'Aarav Patel',
      avatarUrl: null,
      role: 'student',
      headline: 'Full-Stack Developer @ COEP Pune',
    },
    likesCount: 14,
    commentsCount: 3,
    hasLiked: false,
  },
  {
    id: 'post-seed-2',
    authorProfileId: 'author-biz-1',
    postType: 'business_milestone',
    title: 'Kavita Textiles launched its digital store with student help!',
    content:
      'We wanted to take our handcrafted handloom sarees online across India. Our student intern Priya set up our product catalog and digital payments in under two weeks. We received our first 40 orders this weekend! Excited to mentor more students through SkillBridge.',
    projectId: null,
    mediaUrls: [],
    skillsHighlighted: ['E-Commerce', 'SEO', 'Payment Gateways'],
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    author: {
      id: 'author-biz-1',
      fullName: 'Kavita Sundaram',
      avatarUrl: null,
      role: 'business',
      organizationName: 'Kavita Handlooms',
    },
    likesCount: 28,
    commentsCount: 5,
    hasLiked: false,
  },
  {
    id: 'post-seed-3',
    authorProfileId: 'author-student-2',
    postType: 'achievement',
    title: 'Top Rated Contributor badge unlocked this month',
    content:
      'Super excited to have received a 5-star review from Rajkot Auto Spares after building their invoice generator. SkillBridge makes it so easy to work with real Indian businesses right while managing our college schedule.',
    projectId: null,
    mediaUrls: [],
    skillsHighlighted: ['TypeScript', 'PDF Generation', 'Node.js'],
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    author: {
      id: 'author-student-2',
      fullName: 'Neha Deshmukh',
      avatarUrl: null,
      role: 'student',
      headline: 'Software Engineering Junior @ VJTI Mumbai',
    },
    likesCount: 42,
    commentsCount: 7,
    hasLiked: false,
  },
  {
    id: 'post-seed-4',
    authorProfileId: 'author-biz-2',
    postType: 'project_update',
    title: 'Looking for 2 students to build our Milk Route Optimization app',
    content:
      'DesiDairy Coop delivers to 1,200 households daily in Nashik. We are looking for 2 eager engineering students to help us map optimal morning delivery routes using Google Maps & open-source routing algorithms. 3-week project with stipend and direct mentorship.',
    projectId: null,
    mediaUrls: [],
    skillsHighlighted: ['Routing Algorithms', 'Google Maps API', 'React Native'],
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    author: {
      id: 'author-biz-2',
      fullName: 'Ramesh Kulkarni',
      avatarUrl: null,
      role: 'business',
      organizationName: 'DesiDairy Co-operative',
    },
    likesCount: 19,
    commentsCount: 8,
    hasLiked: false,
  },
];

const fallbackLikes = new Set<string>();
const fallbackComments: CommunityComment[] = [
  {
    id: 'comment-seed-1',
    postId: 'post-seed-1',
    authorProfileId: 'author-student-2',
    content: 'Incredible work Aarav! The WhatsApp alert integration is super practical.',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    author: {
      id: 'author-student-2',
      fullName: 'Neha Deshmukh',
      avatarUrl: null,
      role: 'student',
    },
  },
];

// Role-based isolation for student & business discussion communities
async function authorizeCommunityAccess(communityType: CommunityType) {
  const current = await requireRole(communityType);
  return current;
}

export async function getCommunityPosts(communityType: CommunityType, page = 1, limit = 20) {
  await authorizeCommunityAccess(communityType);
  const offset = (page - 1) * limit;

  if (process.env.DATABASE_URL) {
    try {
      const rows = await database()`
        SELECT
          p.id, p.author_id, p.community_type, p.title, p.body, p.category, p.tags, p.created_at, p.updated_at,
          u.full_name as author_name, u.avatar_url as author_avatar,
          COALESCE(c.comment_count, 0)::int as comment_count,
          COALESCE(r.like_count, 0)::int as like_count
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
    } catch {
      return [];
    }
  }
  return [];
}

export async function getCommunityPost(communityType: CommunityType, postId: string) {
  await authorizeCommunityAccess(communityType);

  if (process.env.DATABASE_URL) {
    try {
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
    } catch {
      return null;
    }
  }
  return null;
}

export interface GetFeedOptions {
  postType?: string | null;
  role?: string | null;
  search?: string | null;
  currentProfileId?: string | null;
  limit?: number;
  offset?: number;
}

export async function getCommunityFeed(options: GetFeedOptions = {}): Promise<CommunityPost[]> {
  const { postType, role, search, currentProfileId, limit = 20, offset = 0 } = options;

  if (process.env.DATABASE_URL) {
    try {
      const sql = database();
      const whereConditions = [];

      let query = sql`
        SELECT
          p.id,
          p.author_profile_id,
          p.post_type,
          p.title,
          p.content,
          p.project_id,
          p.media_urls,
          p.skills_highlighted,
          p.created_at,
          p.updated_at,
          pr.full_name AS author_name,
          pr.avatar_url AS author_avatar,
          pr.role AS author_role,
          bp.business_name,
          sp.bio AS student_headline,
          proj.id AS attached_proj_id,
          proj.title AS attached_proj_title,
          proj.category AS attached_proj_category,
          proj.status AS attached_proj_status,
          COALESCE(likes.cnt, 0)::int AS likes_count,
          COALESCE(cmts.cnt, 0)::int AS comments_count,
          EXISTS(
            SELECT 1 FROM skillbridge.community_post_likes my_l
            WHERE my_l.post_id = p.id AND my_l.profile_id = ${currentProfileId ?? null}
          ) AS has_liked
        FROM skillbridge.community_posts p
        JOIN skillbridge.profiles pr ON pr.id = p.author_profile_id
        LEFT JOIN skillbridge.business_profiles bp ON bp.profile_id = pr.id
        LEFT JOIN skillbridge.student_profiles sp ON sp.profile_id = pr.id
        LEFT JOIN skillbridge.projects proj ON proj.id = p.project_id
        LEFT JOIN (
          SELECT post_id, COUNT(*) AS cnt FROM skillbridge.community_post_likes GROUP BY post_id
        ) likes ON likes.post_id = p.id
        LEFT JOIN (
          SELECT post_id, COUNT(*) AS cnt FROM skillbridge.community_comments GROUP BY post_id
        ) cmts ON cmts.post_id = p.id
        WHERE 1=1
      `;

      if (postType && postType !== 'all') {
        query = sql`${query} AND p.post_type = ${postType}`;
      }
      if (role) {
        query = sql`${query} AND pr.role = ${role}`;
      }
      if (search && search.trim()) {
        const pattern = `%${search.trim()}%`;
        query = sql`${query} AND (p.title ILIKE ${pattern} OR p.content ILIKE ${pattern})`;
      }

      query = sql`${query} ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

      const rows = await query;
      return rows.map((r: any) => ({
        id: r.id,
        authorProfileId: r.author_profile_id,
        postType: r.post_type,
        title: r.title,
        content: r.content,
        projectId: r.project_id,
        mediaUrls: r.media_urls ?? [],
        skillsHighlighted: r.skills_highlighted ?? [],
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
        author: {
          id: r.author_profile_id,
          fullName: r.author_name || 'Community Member',
          avatarUrl: r.author_avatar,
          role: r.author_role,
          headline: r.student_headline,
          organizationName: r.business_name,
        },
        project: r.attached_proj_id
          ? {
              id: r.attached_proj_id,
              title: r.attached_proj_title,
              category: r.attached_proj_category,
              status: r.attached_proj_status,
            }
          : null,
        likesCount: Number(r.likes_count || 0),
        commentsCount: Number(r.comments_count || 0),
        hasLiked: Boolean(r.has_liked),
      }));
    } catch (err) {
      console.warn('Database community feed failed, serving resilient fallback:', err);
    }
  }

  // Resilient in-memory fallback
  return fallbackPosts.filter((p) => {
    if (postType && postType !== 'all' && p.postType !== postType) return false;
    if (role && p.author.role !== role) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.content.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export interface CreatePostInput {
  authorProfileId: string;
  postType: PostType;
  title: string;
  content: string;
  projectId?: string | null;
  mediaUrls?: string[];
  skillsHighlighted?: string[];
}

export async function createCommunityPost(input: CreatePostInput): Promise<CommunityPost>;
export async function createCommunityPost(
  communityType: CommunityType,
  title: string,
  body: string,
  category: string,
  tags?: string[]
): Promise<string>;
export async function createCommunityPost(
  arg1: any,
  arg2?: any,
  arg3?: any,
  arg4?: any,
  arg5?: any
): Promise<any> {
  if (typeof arg1 === 'string' && (arg1 === 'student' || arg1 === 'business')) {
    const communityType = arg1 as CommunityType;
    const title = arg2 as string;
    const body = arg3 as string;
    const category = arg4 as string;
    const tags = (arg5 as string[]) || [];

    const current = await authorizeCommunityAccess(communityType);
    if (process.env.DATABASE_URL) {
      const rows = await database()`
        INSERT INTO skillbridge.community_posts (author_id, community_type, title, body, category, tags)
        VALUES (${current.profile.id}, ${communityType}, ${title}, ${body}, ${category}, ${tags})
        RETURNING id
      `;
      return rows[0].id;
    }
    return `post-${Date.now()}`;
  }

  const {
    authorProfileId,
    postType,
    title,
    content,
    projectId,
    mediaUrls = [],
    skillsHighlighted = [],
  } = arg1 as CreatePostInput;

  if (!title || title.trim().length < 3) {
    throw new Error('Title must be at least 3 characters long');
  }
  if (!content || content.trim().length < 5) {
    throw new Error('Post content must be at least 5 characters long');
  }

  if (process.env.DATABASE_URL) {
    const sql = database();

    if (projectId) {
      const allowed = await sql`
        SELECT 1 FROM skillbridge.projects p
        WHERE p.id = ${projectId}
          AND (
            p.status = 'published'
            OR p.owner_profile_id = ${authorProfileId}
            OR EXISTS (
              SELECT 1 FROM skillbridge.applications a
              JOIN skillbridge.student_profiles sp ON sp.id = a.student_id
              WHERE a.project_id = p.id AND sp.profile_id = ${authorProfileId}
            )
          )
        LIMIT 1
      `;
      if (!allowed.length) {
        throw new Error('You do not have permission to attach this project.');
      }
    }

    const [row] = await sql`
      INSERT INTO skillbridge.community_posts (
        author_profile_id,
        post_type,
        title,
        content,
        project_id,
        media_urls,
        skills_highlighted
      ) VALUES (
        ${authorProfileId},
        ${postType},
        ${title.trim()},
        ${content.trim()},
        ${projectId ?? null},
        ${mediaUrls},
        ${skillsHighlighted}
      )
      RETURNING *
    `;

    const [profile] = await sql`
      SELECT pr.*, bp.business_name, sp.bio AS student_headline
      FROM skillbridge.profiles pr
      LEFT JOIN skillbridge.business_profiles bp ON bp.profile_id = pr.id
      LEFT JOIN skillbridge.student_profiles sp ON sp.profile_id = pr.id
      WHERE pr.id = ${authorProfileId}
    `;

    let proj = null;
    if (projectId) {
      const [pRow] = await sql`SELECT id, title, category, status FROM skillbridge.projects WHERE id = ${projectId}`;
      if (pRow) proj = { id: pRow.id, title: pRow.title, category: pRow.category, status: pRow.status };
    }

    return {
      id: row.id,
      authorProfileId: row.author_profile_id,
      postType: row.post_type,
      title: row.title,
      content: row.content,
      projectId: row.project_id,
      mediaUrls: row.media_urls ?? [],
      skillsHighlighted: row.skills_highlighted ?? [],
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      author: {
        id: authorProfileId,
        fullName: profile?.full_name || 'Community Member',
        avatarUrl: profile?.avatar_url || null,
        role: profile?.role || 'student',
        headline: profile?.student_headline,
        organizationName: profile?.business_name,
      },
      project: proj,
      likesCount: 0,
      commentsCount: 0,
      hasLiked: false,
    };
  }

  // Fallback
  const newPost: CommunityPost = {
    id: `post-${Date.now()}`,
    authorProfileId,
    postType,
    title: title.trim(),
    content: content.trim(),
    projectId: projectId ?? null,
    mediaUrls,
    skillsHighlighted,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: {
      id: authorProfileId,
      fullName: 'You',
      avatarUrl: null,
      role: 'student',
    },
    likesCount: 0,
    commentsCount: 0,
    hasLiked: false,
  };
  fallbackPosts.unshift(newPost);
  return newPost;
}

export async function deleteCommunityPost(communityType: CommunityType, postId: string): Promise<boolean>;
export async function deleteCommunityPost(postId: string, authorProfileId?: string): Promise<boolean>;
export async function deleteCommunityPost(arg1: string, arg2?: string): Promise<boolean> {
  if (arg1 === 'student' || arg1 === 'business') {
    const communityType = arg1 as CommunityType;
    const postId = arg2 as string;
    const current = await authorizeCommunityAccess(communityType);
    if (process.env.DATABASE_URL) {
      const rows = await database()`
        UPDATE skillbridge.community_posts
        SET deleted_at = now()
        WHERE id = ${postId} AND author_id = ${current.profile.id} AND community_type = ${communityType}
        RETURNING id
      `;
      return rows.length > 0;
    }
    return true;
  }

  const postId = arg1;
  const authorProfileId = arg2;

  if (process.env.DATABASE_URL) {
    const sql = database();
    const result = await sql`
      DELETE FROM skillbridge.community_posts
      WHERE id = ${postId} AND author_profile_id = ${authorProfileId ?? ''}
      RETURNING id
    `;
    return result.length > 0;
  }

  const idx = fallbackPosts.findIndex((p) => p.id === postId && p.authorProfileId === authorProfileId);
  if (idx !== -1) {
    fallbackPosts.splice(idx, 1);
    return true;
  }
  return false;
}

export async function togglePostLike(
  postId: string,
  profileId: string
): Promise<{ liked: boolean; likesCount: number }> {
  if (process.env.DATABASE_URL) {
    const sql = database();

    const existing = await sql`
      SELECT 1 FROM skillbridge.community_post_likes
      WHERE post_id = ${postId} AND profile_id = ${profileId}
    `;

    if (existing.length > 0) {
      await sql`
        DELETE FROM skillbridge.community_post_likes
        WHERE post_id = ${postId} AND profile_id = ${profileId}
      `;
    } else {
      await sql`
        INSERT INTO skillbridge.community_post_likes (post_id, profile_id)
        VALUES (${postId}, ${profileId})
        ON CONFLICT DO NOTHING
      `;
    }

    const [countRow] = await sql`
      SELECT COUNT(*)::int AS count FROM skillbridge.community_post_likes WHERE post_id = ${postId}
    `;
    return {
      liked: existing.length === 0,
      likesCount: Number(countRow?.count || 0),
    };
  }

  const key = `${postId}:${profileId}`;
  const had = fallbackLikes.has(key);
  if (had) {
    fallbackLikes.delete(key);
  } else {
    fallbackLikes.add(key);
  }

  const post = fallbackPosts.find((p) => p.id === postId);
  if (post) {
    post.likesCount += had ? -1 : 1;
    post.hasLiked = !had;
  }

  return {
    liked: !had,
    likesCount: post?.likesCount ?? (had ? 0 : 1),
  };
}

export async function getPostComments(postId: string): Promise<CommunityComment[]>;
export async function getPostComments(communityType: CommunityType, postId: string): Promise<any[]>;
export async function getPostComments(arg1: CommunityType | string, arg2?: string): Promise<any> {
  if (arg1 === 'student' || arg1 === 'business') {
    const communityType = arg1 as CommunityType;
    const postId = arg2 as string;
    await authorizeCommunityAccess(communityType);
    if (process.env.DATABASE_URL) {
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
    return [];
  }

  const postId = arg1 as string;
  if (process.env.DATABASE_URL) {
    const sql = database();
    const rows = await sql`
      SELECT
        c.id,
        c.post_id,
        c.author_profile_id,
        c.content,
        c.created_at,
        pr.full_name AS author_name,
        pr.avatar_url AS author_avatar,
        pr.role AS author_role,
        bp.business_name,
        sp.bio AS student_headline
      FROM skillbridge.community_comments c
      JOIN skillbridge.profiles pr ON pr.id = c.author_profile_id
      LEFT JOIN skillbridge.business_profiles bp ON bp.profile_id = pr.id
      LEFT JOIN skillbridge.student_profiles sp ON sp.profile_id = pr.id
      WHERE c.post_id = ${postId}
      ORDER BY c.created_at ASC
    `;

    return rows.map((r: any) => ({
      id: r.id,
      postId: r.post_id,
      authorProfileId: r.author_profile_id,
      content: r.content,
      createdAt: new Date(r.created_at).toISOString(),
      author: {
        id: r.author_profile_id,
        fullName: r.author_name || 'Member',
        avatarUrl: r.author_avatar,
        role: r.author_role,
        headline: r.student_headline,
        organizationName: r.business_name,
      },
    }));
  }

  return fallbackComments.filter((c) => c.postId === postId);
}

export async function addComment(
  communityType: CommunityType,
  postId: string,
  body: string,
  parentCommentId: string | null = null
): Promise<string> {
  const current = await authorizeCommunityAccess(communityType);
  if (process.env.DATABASE_URL) {
    const post = await database()`SELECT id FROM skillbridge.community_posts WHERE id = ${postId} AND community_type = ${communityType}`;
    if (post.length === 0) throw new Error("Post not found in this community");

    const rows = await database()`
      INSERT INTO skillbridge.community_comments (post_id, author_id, parent_comment_id, body)
      VALUES (${postId}, ${current.profile.id}, ${parentCommentId}, ${body})
      RETURNING id
    `;
    return rows[0].id;
  }
  return `comment-${Date.now()}`;
}

export async function deleteComment(communityType: CommunityType, commentId: string): Promise<boolean> {
  const current = await authorizeCommunityAccess(communityType);
  if (process.env.DATABASE_URL) {
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
  return true;
}

export async function toggleReaction(communityType: CommunityType, postId: string): Promise<boolean> {
  const current = await authorizeCommunityAccess(communityType);
  if (process.env.DATABASE_URL) {
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
  return true;
}

export async function addPostComment(
  postId: string,
  authorProfileId: string,
  content: string
): Promise<CommunityComment> {
  const clean = content.trim();
  if (!clean || clean.length < 1 || clean.length > 2000) {
    throw new Error('Comment must be between 1 and 2000 characters');
  }

  if (process.env.DATABASE_URL) {
    const sql = database();
    const [row] = await sql`
      INSERT INTO skillbridge.community_comments (post_id, author_profile_id, content)
      VALUES (${postId}, ${authorProfileId}, ${clean})
      RETURNING *
    `;

    const [profile] = await sql`
      SELECT pr.*, bp.business_name, sp.bio AS student_headline
      FROM skillbridge.profiles pr
      LEFT JOIN skillbridge.business_profiles bp ON bp.profile_id = pr.id
      LEFT JOIN skillbridge.student_profiles sp ON sp.profile_id = pr.id
      WHERE pr.id = ${authorProfileId}
    `;

    return {
      id: row.id,
      postId: row.post_id,
      authorProfileId: row.author_profile_id,
      content: row.content,
      createdAt: new Date(row.created_at).toISOString(),
      author: {
        id: authorProfileId,
        fullName: profile?.full_name || 'Member',
        avatarUrl: profile?.avatar_url || null,
        role: profile?.role || 'student',
        headline: profile?.student_headline,
        organizationName: profile?.business_name,
      },
    };
  }

  const newComment: CommunityComment = {
    id: `comment-${Date.now()}`,
    postId,
    authorProfileId,
    content: clean,
    createdAt: new Date().toISOString(),
    author: {
      id: authorProfileId,
      fullName: 'You',
      avatarUrl: null,
      role: 'student',
    },
  };
  fallbackComments.push(newComment);
  return newComment;
}

export async function deletePostComment(commentId: string, authorProfileId: string): Promise<boolean> {
  if (process.env.DATABASE_URL) {
    const sql = database();
    const result = await sql`
      DELETE FROM skillbridge.community_comments
      WHERE id = ${commentId} AND author_profile_id = ${authorProfileId}
      RETURNING id
    `;
    return result.length > 0;
  }

  const idx = fallbackComments.findIndex((c) => c.id === commentId && c.authorProfileId === authorProfileId);
  if (idx !== -1) {
    fallbackComments.splice(idx, 1);
    return true;
  }
  return false;
}
