import 'server-only';
import { database } from '@/lib/db';

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
    hasLiked: true,
  },
  {
    id: 'post-seed-3',
    authorProfileId: 'author-student-2',
    postType: 'achievement',
    title: 'Earned AWS Solutions Architect Associate Certification',
    content:
      'Thrilled to share that I passed my AWS Solutions Architect exam today! The real-world experience configuring database backups and microservices during my SkillBridge local business engagement gave me practical intuition that went way beyond theory.',
    projectId: null,
    mediaUrls: [],
    skillsHighlighted: ['AWS', 'Cloud Architecture', 'DevOps'],
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    author: {
      id: 'author-student-2',
      fullName: 'Neha Deshmukh',
      avatarUrl: null,
      role: 'student',
      headline: 'Cloud & Systems Engineering Student',
    },
    likesCount: 39,
    commentsCount: 6,
    hasLiked: false,
  },
];

const fallbackLikes = new Set<string>(['post-seed-2:user-self']);
const fallbackComments: CommunityComment[] = [
  {
    id: 'comment-1',
    postId: 'post-seed-1',
    authorProfileId: 'author-biz-1',
    content: 'Incredible work Aarav! You set an example for how students and local retail can partner together.',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    author: {
      id: 'author-biz-1',
      fullName: 'Kavita Sundaram',
      avatarUrl: null,
      role: 'business',
      organizationName: 'Kavita Handlooms',
    },
  },
  {
    id: 'comment-2',
    postId: 'post-seed-1',
    authorProfileId: 'author-student-2',
    content: 'Awesome architecture! Did you use Neon serverless functions or background cron?',
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    author: {
      id: 'author-student-2',
      fullName: 'Neha Deshmukh',
      avatarUrl: null,
      role: 'student',
      headline: 'Cloud & Systems Engineering Student',
    },
  },
];

export interface GetFeedOptions {
  postType?: string | null;
  role?: string | null;
  search?: string | null;
  currentProfileId?: string | null;
  limit?: number;
  offset?: number;
}

export async function getCommunityFeed(options: GetFeedOptions = {}): Promise<CommunityPost[]> {
  const { postType, role, search, currentProfileId, limit = 30, offset = 0 } = options;

  if (process.env.DATABASE_URL) {
    try {
      const sql = database();
      const pattern = search ? `%${search.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;

      const rows = await sql`
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
          proj.title AS project_title,
          proj.category AS project_category,
          proj.status AS project_status,
          COALESCE((SELECT COUNT(*)::int FROM skillbridge.community_post_likes l WHERE l.post_id = p.id), 0) AS likes_count,
          COALESCE((SELECT COUNT(*)::int FROM skillbridge.community_comments c WHERE c.post_id = p.id), 0) AS comments_count,
          EXISTS(SELECT 1 FROM skillbridge.community_post_likes l WHERE l.post_id = p.id AND l.profile_id = ${currentProfileId ?? null}::uuid) AS has_liked
        FROM skillbridge.community_posts p
        JOIN skillbridge.profiles pr ON pr.id = p.author_profile_id
        LEFT JOIN skillbridge.business_profiles bp ON bp.profile_id = pr.id
        LEFT JOIN skillbridge.student_profiles sp ON sp.profile_id = pr.id
        LEFT JOIN skillbridge.projects proj ON proj.id = p.project_id
        WHERE (${postType ?? null}::text IS NULL OR p.post_type = ${postType})
          AND (${role ?? null}::text IS NULL OR pr.role = ${role})
          AND (${pattern}::text IS NULL OR p.title ILIKE ${pattern} OR p.content ILIKE ${pattern})
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

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
        project: r.project_id
          ? {
              id: r.project_id,
              title: r.project_title ?? 'Associated Project',
              category: r.project_category ?? 'General',
              status: r.project_status ?? 'published',
            }
          : null,
        likesCount: Number(r.likes_count),
        commentsCount: Number(r.comments_count),
        hasLiked: Boolean(r.has_liked),
      }));
    } catch (err) {
      console.warn('Database query for community feed failed, using fallback:', err);
    }
  }

  // Fallback filtering
  return fallbackPosts.filter((p) => {
    if (postType && p.postType !== postType) return false;
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

export async function createCommunityPost(input: CreatePostInput): Promise<CommunityPost> {
  const {
    authorProfileId,
    postType,
    title,
    content,
    projectId,
    mediaUrls = [],
    skillsHighlighted = [],
  } = input;

  if (!title || title.trim().length < 3) {
    throw new Error('Title must be at least 3 characters long');
  }
  if (!content || content.trim().length < 5) {
    throw new Error('Post content must be at least 5 characters long');
  }

  if (process.env.DATABASE_URL) {
    const sql = database();

    // Verify project permission if attached
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

    // Fetch author info
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

export async function deleteCommunityPost(postId: string, authorProfileId: string): Promise<boolean> {
  if (process.env.DATABASE_URL) {
    const sql = database();
    const result = await sql`
      DELETE FROM skillbridge.community_posts
      WHERE id = ${postId} AND author_profile_id = ${authorProfileId}
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

    // Check if like exists
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

export async function getPostComments(postId: string): Promise<CommunityComment[]> {
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
