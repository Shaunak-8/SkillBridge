import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));

import {
  getCommunityFeed,
  createCommunityPost,
  deleteCommunityPost,
  togglePostLike,
  getPostComments,
  addPostComment,
  deletePostComment,
} from '@/lib/community/service';

describe('Community System Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCommunityFeed', () => {
    it('retrieves community feed with posts and authors', async () => {
      const posts = await getCommunityFeed();
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThan(0);

      const first = posts[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('title');
      expect(first).toHaveProperty('content');
      expect(first).toHaveProperty('author');
      expect(first.author).toHaveProperty('fullName');
      expect(first.author).toHaveProperty('role');
    });

    it('filters posts by post type', async () => {
      const completedPosts = await getCommunityFeed({ postType: 'completed_project' });
      expect(completedPosts.every((p) => p.postType === 'completed_project')).toBe(true);

      const achievements = await getCommunityFeed({ postType: 'achievement' });
      expect(achievements.every((p) => p.postType === 'achievement')).toBe(true);
    });

    it('filters posts by author role', async () => {
      const studentPosts = await getCommunityFeed({ role: 'student' });
      expect(studentPosts.every((p) => p.author.role === 'student')).toBe(true);

      const businessPosts = await getCommunityFeed({ role: 'business' });
      expect(businessPosts.every((p) => p.author.role === 'business')).toBe(true);
    });

    it('filters posts by search query', async () => {
      const results = await getCommunityFeed({ search: 'inventory' });
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some((p) => p.title.toLowerCase().includes('inventory') || p.content.toLowerCase().includes('inventory'))
      ).toBe(true);
    });
  });

  describe('createCommunityPost', () => {
    it('rejects short or empty titles', async () => {
      await expect(
        createCommunityPost({
          authorProfileId: 'author-1',
          postType: 'general',
          title: 'hi',
          content: 'This is a valid long content.',
        })
      ).rejects.toThrow(/at least 3 characters/);
    });

    it('rejects short content', async () => {
      await expect(
        createCommunityPost({
          authorProfileId: 'author-1',
          postType: 'general',
          title: 'Valid Title Here',
          content: 'tiny',
        })
      ).rejects.toThrow(/at least 5 characters/);
    });

    it('creates and returns a new community post', async () => {
      const newPost = await createCommunityPost({
        authorProfileId: 'test-student-1',
        postType: 'completed_project',
        title: 'Built an automated billing system for a grocery shop',
        content: 'Delivered a barcode scanner integration with Next.js and Postgres for local shopkeeper Mr. Gupta.',
        skillsHighlighted: ['Next.js', 'PostgreSQL'],
      });

      expect(newPost).toBeDefined();
      expect(newPost.title).toBe('Built an automated billing system for a grocery shop');
      expect(newPost.postType).toBe('completed_project');
      expect(newPost.skillsHighlighted).toContain('Next.js');

      // Verify it appears in feed
      const feed = await getCommunityFeed();
      expect(feed.some((p) => p.id === newPost.id)).toBe(true);
    });
  });

  describe('Likes and comments interactions', () => {
    it('toggles likes idempotently without duplicates', async () => {
      const postId = 'post-seed-1';
      const userId = 'user-test-liker';

      // First like
      const res1 = await togglePostLike(postId, userId);
      expect(res1.liked).toBe(true);

      // Second like (unlikes)
      const res2 = await togglePostLike(postId, userId);
      expect(res2.liked).toBe(false);
    });

    it('adds and lists comments on a post', async () => {
      const postId = 'post-seed-1';
      const authorId = 'commenter-profile-1';

      const comment = await addPostComment(postId, authorId, 'Great work on this implementation!');
      expect(comment).toBeDefined();
      expect(comment.content).toBe('Great work on this implementation!');

      const comments = await getPostComments(postId);
      expect(comments.some((c) => c.id === comment.id)).toBe(true);
    });

    it('rejects empty comments', async () => {
      await expect(addPostComment('post-seed-1', 'author-1', '   ')).rejects.toThrow();
    });

    it('allows author to delete their comment', async () => {
      const comment = await addPostComment('post-seed-2', 'author-del', 'Test comment to be removed');
      const deleted = await deletePostComment(comment.id, 'author-del');
      expect(deleted).toBe(true);

      const comments = await getPostComments('post-seed-2');
      expect(comments.some((c) => c.id === comment.id)).toBe(false);
    });
  });

  describe('Post Deletion and Authorization', () => {
    it('author can delete their own post', async () => {
      const post = await createCommunityPost({
        authorProfileId: 'delete-author-1',
        postType: 'general',
        title: 'Temporary post for testing deletion',
        content: 'This post will be deleted in the next assertion.',
      });

      const deleted = await deleteCommunityPost(post.id, 'delete-author-1');
      expect(deleted).toBe(true);

      const feed = await getCommunityFeed();
      expect(feed.some((p) => p.id === post.id)).toBe(false);
    });

    it('non-author cannot delete another user post', async () => {
      const post = await createCommunityPost({
        authorProfileId: 'real-author',
        postType: 'achievement',
        title: 'Real achievement post',
        content: 'Original content that should not be deleted by unauthorized user.',
      });

      const deleted = await deleteCommunityPost(post.id, 'attacker-profile');
      expect(deleted).toBe(false);

      const feed = await getCommunityFeed();
      expect(feed.some((p) => p.id === post.id)).toBe(true);
    });
  });
});
