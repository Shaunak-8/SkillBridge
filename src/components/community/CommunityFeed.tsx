'use client';

import { useState, useEffect, useTransition } from 'react';
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
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { PostComposer } from './PostComposer';
import { PostCard } from './PostCard';
import type { CommunityPost } from '@/lib/community/service';

interface CommunityFeedProps {
  initialPosts: CommunityPost[];
  currentProfileId?: string | null;
  currentUserRole?: string | null;
}

type FilterTab = 'all' | 'students' | 'businesses' | 'completed_project' | 'achievement' | 'project_update';

export function CommunityFeed({
  initialPosts,
  currentProfileId,
  currentUserRole,
}: CommunityFeedProps) {
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
            Sign in to share project milestones, celebrate student accomplishments, like, and comment.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href="/login"
              className="btn-press rounded-xl border-2 border-[#111111] bg-white px-4 py-2 text-xs font-black text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F7F0D2] transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="btn-press rounded-xl border-2 border-[#111111] bg-[#D83D63] px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[2px_2px_0_#111111] hover:bg-[#c22e53] transition"
            >
              Get Started
            </Link>
          </div>
        </Card>
      )}

      {/* Discovery & Filter Bar */}
      <Card className="p-4 bg-white border-2 border-[#111111] shadow-[4px_4px_0_#111111]">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#655F52]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search posts by skill, business, or project keyword..."
            className="w-full rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/25 pl-10 pr-24 py-2 text-xs sm:text-sm font-bold text-[#151515] outline-none focus:bg-white focus:shadow-[2px_2px_0_#111111] transition"
          />
          <button
            type="submit"
            className="btn-press absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg border border-[#111111] bg-[#F2BE4E] px-3 py-1 text-xs font-black text-[#151515] shadow-[1px_1px_0_#111111]"
          >
            Search
          </button>
        </form>

        {/* Filter Pills */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#111111]/10">
          <button
            type="button"
            onClick={() => handleTabChange('all')}
            className={`rounded-lg border-2 px-3 py-1 text-xs font-black transition-all ${
              activeTab === 'all'
                ? 'border-[#111111] bg-[#151515] text-white shadow-[2px_2px_0_#111111]'
                : 'border-transparent text-[#655F52] hover:border-[#111111] hover:bg-[#F7F0D2] hover:text-[#151515]'
            }`}
          >
            All Posts
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('students')}
            className={`flex items-center gap-1 rounded-lg border-2 px-3 py-1 text-xs font-black transition-all ${
              activeTab === 'students'
                ? 'border-[#111111] bg-[#e0e7ff] text-indigo-900 shadow-[2px_2px_0_#111111]'
                : 'border-transparent text-[#655F52] hover:border-[#111111] hover:bg-[#F7F0D2] hover:text-[#151515]'
            }`}
          >
            <GraduationCap size={13} /> Students
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('businesses')}
            className={`flex items-center gap-1 rounded-lg border-2 px-3 py-1 text-xs font-black transition-all ${
              activeTab === 'businesses'
                ? 'border-[#111111] bg-[#F2BE4E] text-[#151515] shadow-[2px_2px_0_#111111]'
                : 'border-transparent text-[#655F52] hover:border-[#111111] hover:bg-[#F7F0D2] hover:text-[#151515]'
            }`}
          >
            <Store size={13} /> Businesses
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('completed_project')}
            className={`flex items-center gap-1 rounded-lg border-2 px-3 py-1 text-xs font-black transition-all ${
              activeTab === 'completed_project'
                ? 'border-[#111111] bg-[#dbf5ed] text-emerald-900 shadow-[2px_2px_0_#111111]'
                : 'border-transparent text-[#655F52] hover:border-[#111111] hover:bg-[#F7F0D2] hover:text-[#151515]'
            }`}
          >
            <CheckCircle2 size={13} /> Completed Projects
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('achievement')}
            className={`flex items-center gap-1 rounded-lg border-2 px-3 py-1 text-xs font-black transition-all ${
              activeTab === 'achievement'
                ? 'border-[#111111] bg-[#F2BE4E] text-[#151515] shadow-[2px_2px_0_#111111]'
                : 'border-transparent text-[#655F52] hover:border-[#111111] hover:bg-[#F7F0D2] hover:text-[#151515]'
            }`}
          >
            <Trophy size={13} /> Achievements
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('project_update')}
            className={`flex items-center gap-1 rounded-lg border-2 px-3 py-1 text-xs font-black transition-all ${
              activeTab === 'project_update'
                ? 'border-[#111111] bg-[#F7F0D2] text-[#151515] shadow-[2px_2px_0_#111111]'
                : 'border-transparent text-[#655F52] hover:border-[#111111] hover:bg-[#F7F0D2] hover:text-[#151515]'
            }`}
          >
            <TrendingUp size={13} /> Project Updates
          </button>
        </div>
      </Card>

      {/* Feed Stream */}
      {isLoading ? (
        <div className="py-12 text-center">
          <RefreshCw size={24} className="mx-auto animate-spin text-[#D83D63]" />
          <p className="mt-2 text-xs font-bold text-[#655F52]">Loading community feed...</p>
        </div>
      ) : posts.length === 0 ? (
        <Card className="p-8 text-center bg-white border-2 border-[#111111] shadow-[4px_4px_0_#111111]">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border-2 border-[#111111] bg-[#F7F0D2] shadow-[2px_2px_0_#111111]">
            <Users size={22} className="text-[#151515]" />
          </div>
          <h3 className="mt-4 text-base font-black text-[#151515]">No posts found</h3>
          <p className="mt-1 text-xs text-[#655F52] max-w-sm mx-auto">
            {searchQuery
              ? `No community posts matched "${searchQuery}". Try a different keyword or reset filters.`
              : 'There are no posts in this category yet. Be the first to share an accomplishment!'}
          </p>
          {(searchQuery || activeTab !== 'all') && (
            <Button
              variant="secondary"
              onClick={() => {
                setSearchQuery('');
                handleTabChange('all');
              }}
              className="mt-4 text-xs font-bold"
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
