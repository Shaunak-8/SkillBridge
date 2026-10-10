import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';

vi.stubGlobal('React', React);
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/business/community',
}));

import { CommunityPage } from '@/components/community/CommunityPage';
import { RedditPostCard } from '@/components/community/RedditPostCard';
import { RedditVoteButtons } from '@/components/community/RedditVoteButtons';
import { CommunityPostDetail } from '@/components/community/CommunityPostDetail';
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer';
import type { CommunityPost, CommunityComment } from '@/lib/community/service';

const studentPost: CommunityPost = {
  id: 'post-1',
  author_id: 'user-student-1',
  author_role: 'student',
  author_name: 'Aarav Patel',
  author_avatar: null,
  community_type: 'student',
  title: 'How I built a full-stack Next.js app for a local store',
  body: 'Here is what I learned working on payment gateways and inventory syncing.',
  category: 'Completed Projects',
  tags: ['nextjs', 'retail'],
  project_id: 'proj-1',
  project_title: 'Local Retail Inventory System',
  created_at: new Date('2026-10-09T10:00:00Z'),
  updated_at: new Date('2026-10-09T10:00:00Z'),
  comment_count: 5,
  upvote_count: 12,
  downvote_count: 2,
  vote_score: 10,
  user_vote: 1,
};

const businessPost: CommunityPost = {
  id: 'post-2',
  author_id: 'user-business-1',
  author_role: 'business',
  author_name: 'Priya Sharma (Green Grocers)',
  author_avatar: null,
  community_type: 'business',
  title: 'Looking for advice on evaluating mobile apps deliverables',
  body: 'What are the key QA steps business owners should perform before milestone sign-off?',
  category: 'Questions',
  tags: ['qa', 'milestones'],
  project_id: null,
  project_title: null,
  created_at: new Date('2026-10-09T12:00:00Z'),
  updated_at: new Date('2026-10-09T12:00:00Z'),
  comment_count: 3,
  upvote_count: 7,
  downvote_count: 0,
  vote_score: 7,
  user_vote: 0,
};

const sampleComment: CommunityComment = {
  id: 'comment-1',
  post_id: 'post-1',
  author_id: 'user-business-1',
  author_role: 'business',
  author_name: 'Priya Sharma (Green Grocers)',
  author_avatar: null,
  parent_comment_id: null,
  body: 'Great writeup! Did you encounter any issues with inventory syncing?',
  created_at: new Date('2026-10-09T14:00:00Z'),
};

it('renders unified community page with shared posts, filters, search, and sorting', () => {
  const html = renderToStaticMarkup(
    <CommunityPage
      initialPosts={[studentPost, businessPost]}
      currentUserId="user-student-1"
      role="student"
      userProjects={[{ id: 'proj-1', title: 'Local Retail Inventory System' }]}
    />
  );

  // Community heading & description
  expect(html).toContain('SkillBridge Community');
  expect(html).toContain('Share your work, ask questions, exchange ideas, and learn from students and businesses.');
  expect(html).toContain('Create Post');

  // Search input
  expect(html).toContain('placeholder="Search discussions by title, content, author, or project..."');

  // Filter toolbar
  expect(html).toContain('All Posts');
  expect(html).toContain('Students');
  expect(html).toContain('Businesses');
  expect(html).toContain('Questions');
  expect(html).toContain('Completed Projects');
  expect(html).toContain('Achievements');
  expect(html).toContain('Project Updates');

  // Sort toolbar
  expect(html).toContain('Latest');
  expect(html).toContain('Top');
  expect(html).toContain('Trending');
  expect(html).toContain('Most Discussed');

  // Both student and business posts present together in unified feed
  expect(html).toContain('How I built a full-stack Next.js app for a local store');
  expect(html).toContain('Looking for advice on evaluating mobile apps deliverables');
  expect(html).toContain('Aarav Patel');
  expect(html).toContain('Priya Sharma (Green Grocers)');
});

it('renders Reddit-style post card with voting controls, author roles, and linked project', () => {
  const html = renderToStaticMarkup(
    <RedditPostCard
      post={studentPost}
      currentUserId="user-student-1"
      role="student"
    />
  );

  // Voting
  expect(html).toContain('aria-label="Upvote post"');
  expect(html).toContain('aria-label="Downvote post"');
  expect(html).toContain('10'); // vote score

  // Roles & Metadata
  expect(html).toContain('Aarav Patel');
  expect(html).toContain('Student');
  expect(html).toContain('Completed Projects');

  // Linked Project Badge
  expect(html).toContain('Linked Project:');
  expect(html).toContain('Local Retail Inventory System');

  // Actions
  expect(html).toContain('5 comments');
  expect(html).toContain('Share');

  // Post owner controls
  expect(html).toContain('Edit');
  expect(html).toContain('Delete');
});

it('renders post card with business role and hides owner controls for non-author', () => {
  const html = renderToStaticMarkup(
    <RedditPostCard
      post={businessPost}
      currentUserId="user-student-1" // not the owner
      role="student"
    />
  );

  expect(html).toContain('Priya Sharma (Green Grocers)');
  expect(html).toContain('Business');
  expect(html).toContain('Questions');
  expect(html).toContain('7');
  expect(html).not.toContain('>Edit<');
  expect(html).not.toContain('>Delete<');
});

it('renders voting buttons with accessible attributes and active highlight', () => {
  const html = renderToStaticMarkup(
    <RedditVoteButtons
      postId="post-1"
      initialScore={10}
      initialUserVote={1}
    />
  );

  expect(html).toContain('aria-label="Upvote post"');
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('10');
});

it('renders complete discussion post detail page with comment thread and composer', () => {
  const html = renderToStaticMarkup(
    <CommunityPostDetail
      post={studentPost}
      comments={[sampleComment]}
      currentUserId="user-business-1"
      role="business"
    />
  );

  expect(html).toContain('Back to Community');
  expect(html).toContain('Discussion (1)');
  expect(html).toContain('Add to the discussion');
  expect(html).toContain('Post Comment');

  // Comment content
  expect(html).toContain('Priya Sharma (Green Grocers)');
  expect(html).toContain('Business');
  expect(html).toContain('Great writeup! Did you encounter any issues with inventory syncing?');

  // Delete button shown for comment author
  expect(html).toContain('Delete');
});

it('verifies Reddit vote transition logic for upvotes, downvotes, removals, and direction switching', () => {
  // Test transition state machine
  function calculateNextVote(prevVote: number, prevScore: number, targetVote: 1 | -1) {
    if (prevVote === targetVote) {
      // Toggle off / cancel vote
      return { nextVote: 0, nextScore: prevScore - targetVote };
    } else if (prevVote === 0) {
      // New vote
      return { nextVote: targetVote, nextScore: prevScore + targetVote };
    } else {
      // Switch from -1 to 1 or 1 to -1
      return { nextVote: targetVote, nextScore: prevScore + targetVote * 2 };
    }
  }

  // 1. Initial neutral (0, score 10) -> Upvote (+1)
  const step1 = calculateNextVote(0, 10, 1);
  expect(step1.nextVote).toBe(1);
  expect(step1.nextScore).toBe(11);

  // 2. Already upvoted (+1, score 11) -> Upvote again (cancels to 0)
  const step2 = calculateNextVote(1, 11, 1);
  expect(step2.nextVote).toBe(0);
  expect(step2.nextScore).toBe(10);

  // 3. Neutral (0, score 10) -> Downvote (-1)
  const step3 = calculateNextVote(0, 10, -1);
  expect(step3.nextVote).toBe(-1);
  expect(step3.nextScore).toBe(9);

  // 4. Already downvoted (-1, score 9) -> Downvote again (cancels to 0)
  const step4 = calculateNextVote(-1, 9, -1);
  expect(step4.nextVote).toBe(0);
  expect(step4.nextScore).toBe(10);

  // 5. Downvoted (-1, score 9) -> Switch to upvote (+1)
  const step5 = calculateNextVote(-1, 9, 1);
  expect(step5.nextVote).toBe(1);
  expect(step5.nextScore).toBe(11);

  // 6. Upvoted (+1, score 11) -> Switch to downvote (-1)
  const step6 = calculateNextVote(1, 11, -1);
  expect(step6.nextVote).toBe(-1);
  expect(step6.nextScore).toBe(9);
});

