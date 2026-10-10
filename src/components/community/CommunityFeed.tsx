'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Filter,
  Sparkles,
  Trophy,
  CheckCircle2,
  TrendingUp,
  Store,
  GraduationCap,
  RefreshCw,
  MessageSquare,
  Heart,
  Clock,
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { PostComposer } from './PostComposer';
import { PostCard } from './PostCard';
import type { CommunityPost, CommunityType } from '@/lib/community/service';

interface DiscussionPost {
  id: string;
  author_id: string;
  title: string;
  body: string;
  category: string;
  created_at: Date | string;
  author_name: string;
  author_avatar?: string | null;
  comment_count: number;
  like_count: number;
}

interface CommunityFeedProps {
  type?: CommunityType;
  posts?: DiscussionPost[];
  initialPosts?: CommunityPost[];
  currentProfileId?: string | null;
  currentUserRole?: string | null;
}

type FilterTab = 'all' | 'students' | 'businesses' | 'completed_project' | 'achievement' | 'project_update';

export function CommunityFeed(props: CommunityFeedProps) {
  // If role-based discussion community (student or business)
  if (props.type) {
    const { type, posts = [] } = props;
    return (
      <div className="mx-auto space-y-6 max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-[#151515] mb-2">
              {type === 'student' ? 'Student Community' : 'Business Community'}
            </h1>
            <p className="text-[#655F52] text-sm font-medium">
              {type === 'student'
                ? 'Discuss experiences, projects, and advice with fellow students.'
                : 'Discuss hiring, projects, and share advice with other businesses.'}
            </p>
          </div>
          <Link
            href={`/${type}/community/new`}
            className="btn-press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border-2 border-[#111111] bg-[#F2BE4E] px-4 py-2 font-black text-[#151515] shadow-[3px_3px_0_#111111] transition-all hover:bg-[#e0ab3b]"
          >
            New Post
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-2xl border-2 border-[#111111] bg-white p-8 text-center shadow-[4px_4px_0_#111111]">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-[#999]" />
            <h3 className="text-xl font-black mb-2 text-[#151515]">No posts yet</h3>
            <p className="text-[#655F52] text-sm mb-6">
              Be the first to start a discussion in the {type} community.
            </p>
            <Link
              href={`/${type}/community/new`}
              className="inline-flex font-black text-[#D83D63] hover:underline"
            >
              Create the first post →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/${type}/community/${post.id}`}
                className="block rounded-2xl border-2 border-[#111111] bg-white p-6 shadow-[4px_4px_0_#111111] transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0_#111111]"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-xl font-black text-[#151515]">{post.title}</h3>
                  <span className="whitespace-nowrap rounded-md border-2 border-[#111111] bg-[#F7F0D2] px-2.5 py-1 text-xs font-black uppercase tracking-wider text-[#151515]">
                    {post.category}
                  </span>
                </div>
                <p className="line-clamp-2 text-[#444] text-sm mb-4 leading-relaxed">{post.body}</p>

                <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-[#655F52]">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-full bg-gray-200 overflow-hidden border border-[#111111]">
                      {post.author_avatar ? (
                        <img src={post.author_avatar} alt={post.author_name} className="size-full object-cover" />
                      ) : (
                        <div className="size-full bg-[#D83D63] text-white flex items-center justify-center text-xs font-black">
                          {post.author_name?.[0]?.toUpperCase() || 'M'}
                        </div>
                      )}
                    </div>
                    <span className="text-[#151515] font-black">{post.author_name}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <MessageSquare size={15} />
                    <span>{post.comment_count}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Heart size={15} />
                    <span>{post.like_count}</span>
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto">
                    <Clock size={15} />
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Public LinkedIn-style feed
  const { initialPosts = [], currentProfileId, currentUserRole } = props;
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();

  const fetchFilteredPosts = async (tab: FilterTab, query: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab === 'students') params.set('role', 'student');
      else if (tab === 'businesses') params.set('role', 'business');
      else if (tab !== 'all') params.set('postType', tab);

      if (query.trim()) params.set('search', query.trim());

      const res = await fetch(`/api/community/posts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    startTransition(() => {
      fetchFilteredPosts(tab, searchQuery);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFilteredPosts(activeTab, searchQuery);
  };

  const handlePostCreated = (newPost: CommunityPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostDeleted = (deletedPostId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== deletedPostId));
  };

  return (
    <div className="space-y-6">
      {/* Post Composer or Sign-In Prompt */}
      {currentProfileId ? (
        <PostComposer
          onPostCreated={handlePostCreated}
          currentUserRole={currentUserRole}
        />
      ) : (
        <Card className="p-6 bg-white border-2 border-[#111111] shadow-[4px_4px_0_#111111] text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border-2 border-[#111111] bg-[#F2BE4E] shadow-[2px_2px_0_#111111]">
            <Sparkles size={22} className="text-[#151515]" />
          </div>
          <h2 className="mt-3 text-base sm:text-lg font-black text-[#151515]">
            Join the SkillBridge Community
          </h2>
          <p className="mt-1 text-xs text-[#655F52] max-w-md mx-auto">
            Sign in to share project deliverables, celebrate milestones, congratulate peers, and connect directly with local business owners.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="btn-press rounded-xl border-2 border-[#111111] bg-[#D83D63] px-5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0_#111111] hover:bg-[#c22e53]"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="btn-press rounded-xl border-2 border-[#111111] bg-[#F7F0D2] px-5 py-2 text-xs font-black uppercase tracking-wider text-[#151515] shadow-[3px_3px_0_#111111] hover:bg-[#F2BE4E]"
            >
              Create Account
            </Link>
          </div>
        </Card>
      )}

      {/* Filter Navigation & Search Bar */}
      <Card className="p-4 bg-white border-2 border-[#111111] shadow-[4px_4px_0_#111111]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleTabChange('all')}
              className={`rounded-xl border-2 px-3 py-1.5 text-xs font-black transition-all ${
                activeTab === 'all'
                  ? 'border-[#111111] bg-[#111111] text-white shadow-[2px_2px_0_#D83D63]'
                  : 'border-[#111111] bg-[#F7F0D2] text-[#151515] hover:bg-[#F2BE4E]'
              }`}
            >
              All Updates
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('students')}
              className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-xs font-black transition-all ${
                activeTab === 'students'
                  ? 'border-[#111111] bg-[#D83D63] text-white shadow-[2px_2px_0_#111111]'
                  : 'border-[#111111] bg-white text-[#151515] hover:bg-[#F7F0D2]'
              }`}
            >
              <GraduationCap size={14} />
              Students
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('businesses')}
              className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-xs font-black transition-all ${
                activeTab === 'businesses'
                  ? 'border-[#111111] bg-[#F2BE4E] text-[#151515] shadow-[2px_2px_0_#111111]'
                  : 'border-[#111111] bg-white text-[#151515] hover:bg-[#F7F0D2]'
              }`}
            >
              <Store size={14} />
              Businesses
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('completed_project')}
              className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-xs font-black transition-all ${
                activeTab === 'completed_project'
                  ? 'border-[#111111] bg-[#7dd3fc] text-[#151515] shadow-[2px_2px_0_#111111]'
                  : 'border-[#111111] bg-white text-[#151515] hover:bg-[#F7F0D2]'
              }`}
            >
              <CheckCircle2 size={14} />
              Projects Delivered
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('achievement')}
              className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-xs font-black transition-all ${
                activeTab === 'achievement'
                  ? 'border-[#111111] bg-[#fbcfe8] text-[#151515] shadow-[2px_2px_0_#111111]'
                  : 'border-[#111111] bg-white text-[#151515] hover:bg-[#F7F0D2]'
              }`}
            >
              <Trophy size={14} />
              Achievements
            </button>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center min-w-[240px]">
            <Search size={15} className="absolute left-3 text-[#655F52]" />
            <input
              type="text"
              placeholder="Search posts or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/40 py-1.5 pl-9 pr-3 text-xs font-bold text-[#151515] placeholder:text-[#888] focus:border-[#D83D63] focus:bg-white focus:outline-none"
            />
          </form>
        </div>
      </Card>

      {/* Feed List or Empty State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-2 rounded-xl border-2 border-[#111111] bg-white px-5 py-3 shadow-[3px_3px_0_#111111]">
            <RefreshCw size={18} className="animate-spin text-[#D83D63]" />
            <span className="text-xs font-black text-[#151515]">Updating Feed...</span>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <Card className="p-10 bg-white border-2 border-[#111111] shadow-[4px_4px_0_#111111] text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border-2 border-[#111111] bg-[#F7F0D2]">
            <Users size={22} className="text-[#655F52]" />
          </div>
          <h3 className="mt-3 text-base font-black text-[#151515]">No Posts Found</h3>
          <p className="mt-1 text-xs text-[#655F52]">
            {searchQuery
              ? `No updates matched "${searchQuery}". Try a different keyword.`
              : 'Be the first to share an accomplishment or project deliverable!'}
          </p>
          {searchQuery && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSearchQuery('');
                fetchFilteredPosts(activeTab, '');
              }}
              className="mt-4 border-2 border-[#111111] font-bold text-xs"
            >
              Reset Filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-5">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentProfileId={currentProfileId}
              onPostDeleted={handlePostDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
