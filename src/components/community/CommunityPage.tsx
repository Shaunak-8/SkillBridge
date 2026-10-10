'use client';

import { useState, useMemo } from 'react';
import {
  Sparkles,
  Search,
  X,
  MessageSquare,
  Flame,
  ArrowUpNarrowWide,
  Clock,
  MessagesSquare,
  Plus,
} from 'lucide-react';
import type { CommunityPost } from '@/lib/community/service';
import { RedditPostCard } from './RedditPostCard';
import { PostComposerModal } from './PostComposerModal';

interface CommunityPageProps {
  initialPosts: CommunityPost[];
  currentUserId?: string | null;
  role: 'student' | 'business';
  userProjects?: { id: string; title: string }[];
}

const CATEGORY_FILTERS = [
  'All Posts',
  'Students',
  'Businesses',
  'Questions',
  'Completed Projects',
  'Achievements',
  'Project Updates',
];

type SortOption = 'latest' | 'top' | 'trending' | 'most_discussed';

export function CommunityPage({
  initialPosts,
  currentUserId,
  role,
  userProjects = [],
}: CommunityPageProps) {
  const [activeFilter, setActiveFilter] = useState('All Posts');
  const [activeSort, setActiveSort] = useState<SortOption>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  // Filter and sort posts
  const filteredPosts = useMemo(() => {
    let result = [...initialPosts];

    // Filter by category or author role
    if (activeFilter === 'Students') {
      result = result.filter(
        p => p.author_role === 'student' || p.community_type === 'student'
      );
    } else if (activeFilter === 'Businesses') {
      result = result.filter(
        p => p.author_role === 'business' || p.community_type === 'business'
      );
    } else if (activeFilter !== 'All Posts') {
      const f = activeFilter.toLowerCase();
      result = result.filter(p => {
        const cat = (p.category || '').toLowerCase();
        if (f.includes('question')) return cat.includes('question');
        if (f.includes('completed')) return cat.includes('completed') || cat.includes('outcome');
        if (f.includes('achievement')) return cat.includes('achievement');
        if (f.includes('update')) return cat.includes('update') || cat.includes('review');
        return cat.includes(f);
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.body.toLowerCase().includes(q) ||
          (p.project_title && p.project_title.toLowerCase().includes(q)) ||
          p.author_name.toLowerCase().includes(q)
      );
    }

    // Sort posts
    if (activeSort === 'top') {
      result.sort((a, b) => b.vote_score - a.vote_score || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (activeSort === 'most_discussed') {
      result.sort((a, b) => b.comment_count - a.comment_count || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (activeSort === 'trending') {
      result.sort((a, b) => {
        const scoreA = a.vote_score * 2 + a.comment_count * 3;
        const scoreB = b.vote_score * 2 + b.comment_count * 3;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else {
      // Default: latest
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [initialPosts, activeFilter, activeSort, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. Community Header Banner */}
      <div className="rounded-2xl border-2 border-[#111111] bg-white p-6 sm:p-8 shadow-[4px_4px_0_#111111]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-md border-[1.5px] border-[#111111] bg-[#F7F0D2] px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#151515] shadow-[1.5px_1.5px_0_#111111]">
              <Sparkles size={13} className="text-[#D83D63]" />
              SkillBridge Community
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-[#151515]">
              SkillBridge Community
            </h1>
            <p className="text-sm sm:text-base font-medium text-[#655F52] max-w-2xl leading-relaxed">
              Share your work, ask questions, exchange ideas, and learn from students and businesses.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsComposerOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#111111] bg-[#F2BE4E] px-6 py-3.5 text-sm font-black uppercase tracking-wider text-[#151515] shadow-[3px_3px_0_#111111] hover:shadow-none hover:translate-y-0.5 transition-all shrink-0"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Create Post</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-6 relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#655F52]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search discussions by title, content, author, or project..."
            className="w-full rounded-xl border-2 border-[#111111] bg-[#FAF8F5] py-2.5 pl-10 pr-10 text-sm font-medium text-[#151515] placeholder:text-[#8C8476] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D83D63]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 grid size-6 place-items-center rounded-md hover:bg-gray-200"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Toolbars: Filters & Sorting */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Category Filter Pills */}
        <div
          role="tablist"
          aria-label="Category filters"
          className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1"
        >
          {CATEGORY_FILTERS.map(filter => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveFilter(filter)}
                className={`whitespace-nowrap rounded-lg border-2 px-3 py-1.5 text-xs font-bold transition-all ${
                  isActive
                    ? 'border-[#111111] bg-[#F2BE4E] text-[#151515] shadow-[2px_2px_0_#111111]'
                    : 'border-[#111111] bg-white text-[#151515] hover:bg-[#F7F0D2]'
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>

        {/* Sort Controls */}
        <div
          role="group"
          aria-label="Sort discussions"
          className="flex items-center gap-1.5 rounded-xl border-2 border-[#111111] bg-white p-1 shadow-[2px_2px_0_#111111] shrink-0 self-start lg:self-auto"
        >
          <button
            type="button"
            onClick={() => setActiveSort('latest')}
            aria-pressed={activeSort === 'latest'}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              activeSort === 'latest'
                ? 'border-[1.5px] border-[#111111] bg-[#F2BE4E] text-[#151515] shadow-[1px_1px_0_#111111]'
                : 'text-[#655F52] hover:text-[#151515]'
            }`}
          >
            <Clock size={13} strokeWidth={2.2} />
            <span>Latest</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSort('top')}
            aria-pressed={activeSort === 'top'}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              activeSort === 'top'
                ? 'border-[1.5px] border-[#111111] bg-[#F2BE4E] text-[#151515] shadow-[1px_1px_0_#111111]'
                : 'text-[#655F52] hover:text-[#151515]'
            }`}
          >
            <ArrowUpNarrowWide size={13} strokeWidth={2.2} />
            <span>Top</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSort('trending')}
            aria-pressed={activeSort === 'trending'}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              activeSort === 'trending'
                ? 'border-[1.5px] border-[#111111] bg-[#F2BE4E] text-[#151515] shadow-[1px_1px_0_#111111]'
                : 'text-[#655F52] hover:text-[#151515]'
            }`}
          >
            <Flame size={13} strokeWidth={2.2} />
            <span>Trending</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSort('most_discussed')}
            aria-pressed={activeSort === 'most_discussed'}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              activeSort === 'most_discussed'
                ? 'border-[1.5px] border-[#111111] bg-[#F2BE4E] text-[#151515] shadow-[1px_1px_0_#111111]'
                : 'text-[#655F52] hover:text-[#151515]'
            }`}
          >
            <MessagesSquare size={13} strokeWidth={2.2} />
            <span>Most Discussed</span>
          </button>
        </div>
      </div>

      {/* 3. Discussions Feed */}
      {filteredPosts.length === 0 ? (
        <div className="rounded-2xl border-2 border-[#111111] bg-white p-12 text-center shadow-[4px_4px_0_#111111]">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl border-2 border-[#111111] bg-[#F7F0D2] shadow-[3px_3px_0_#111111] mb-4">
            <MessageSquare size={28} className="text-[#655F52]" />
          </div>
          <h3 className="text-xl font-black text-[#151515] mb-2">No discussions found</h3>
          <p className="text-sm font-medium text-[#655F52] max-w-md mx-auto mb-6">
            {searchQuery
              ? `No posts matched "${searchQuery}". Try a different keyword or reset the filters.`
              : `There are no posts in "${activeFilter}". Be the first to start a conversation!`}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {(searchQuery || activeFilter !== 'All Posts') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('All Posts');
                }}
                className="rounded-lg border-2 border-[#111111] bg-white px-4 py-2 text-xs font-bold text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F7F0D2]"
              >
                Clear Filters
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsComposerOpen(true)}
              className="rounded-lg border-2 border-[#111111] bg-[#F2BE4E] px-4 py-2 text-xs font-black uppercase tracking-wider text-[#151515] shadow-[2px_2px_0_#111111] hover:shadow-none hover:translate-y-0.5"
            >
              Start Discussion
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map(post => (
            <RedditPostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              role={role}
            />
          ))}
        </div>
      )}

      {/* 4. Post Composer Modal */}
      <PostComposerModal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        userProjects={userProjects}
      />
    </div>
  );
}
