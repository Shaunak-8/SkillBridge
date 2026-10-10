'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  MessageSquare,
  Sparkles,
  Trophy,
  CheckCircle2,
  TrendingUp,
  Trash2,
  Send,
  ExternalLink,
  Store,
  GraduationCap,
  Languages,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { SkillBadge } from '@/components/shared/ProjectCard';
import { useLanguage } from '@/lib/i18n/context';
import type { CommunityPost, CommunityComment, PostType } from '@/lib/community/service';

interface PostCardProps {
  post: CommunityPost;
  currentProfileId?: string | null;
  onPostDeleted?: (postId: string) => void;
}

const TYPE_CONFIG: Record<
  PostType,
  { label: string; icon: any; bg: string; text: string }
> = {
  completed_project: {
    label: 'Project Completed',
    icon: CheckCircle2,
    bg: 'bg-[#dbf5ed]',
    text: 'text-emerald-900',
  },
  achievement: {
    label: 'Achievement',
    icon: Trophy,
    bg: 'bg-[#F2BE4E]',
    text: 'text-[#151515]',
  },
  project_update: {
    label: 'Project Update',
    icon: TrendingUp,
    bg: 'bg-[#e0e7ff]',
    text: 'text-indigo-900',
  },
  business_milestone: {
    label: 'Business Milestone',
    icon: Sparkles,
    bg: 'bg-[#F7F0D2]',
    text: 'text-[#151515]',
  },
  general: {
    label: 'Discussion',
    icon: MessageSquare,
    bg: 'bg-stone-100',
    text: 'text-stone-800',
  },
};

export function PostCard({ post, currentProfileId, onPostDeleted }: PostCardProps) {
  const { locale } = useLanguage();
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [hasLiked, setHasLiked] = useState(post.hasLiked ?? false);
  const [isLiking, setIsLiking] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dynamic Translation for post
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const typeMeta = TYPE_CONFIG[post.postType] || TYPE_CONFIG.general;
  const TypeIcon = typeMeta.icon;
  const isAuthor = currentProfileId && post.authorProfileId === currentProfileId;

  const handleToggleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    // Optimistic update
    const nextLiked = !hasLiked;
    setHasLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const res = await fetch(`/api/community/posts/${post.id}/likes`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setHasLiked(data.liked);
        setLikesCount(data.likesCount);
      } else {
        // Rollback
        setHasLiked(!nextLiked);
        setLikesCount((prev) => (!nextLiked ? prev + 1 : Math.max(0, prev - 1)));
      }
    } catch {
      // Rollback
      setHasLiked(!nextLiked);
      setLikesCount((prev) => (!nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    } finally {
      setIsLiking(false);
    }
  };

  const handleToggleComments = async () => {
    const nextState = !commentsOpen;
    setCommentsOpen(nextState);
    if (nextState && !commentsLoaded) {
      try {
        const res = await fetch(`/api/community/posts/${post.id}/comments`);
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
          setCommentsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load comments:', err);
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isPostingComment) return;

    setIsPostingComment(true);
    try {
      const res = await fetch(`/api/community/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.comment]);
        setCommentsCount((prev) => prev + 1);
        setNewComment('');
      }
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/community/comments/${commentId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setCommentsCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this community post?')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/community/posts/${post.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onPostDeleted?.(post.id);
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTranslate = async () => {
    if (translatedContent) {
      setShowOriginal(!showOriginal);
      return;
    }
    if (locale === 'en') return;

    setIsTranslating(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: post.content,
          targetLang: locale,
          sourceLang: 'en',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTranslatedContent(data.translated);
        setShowOriginal(false);
      }
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const initials = post.author.fullName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(new Date(post.createdAt));

  const displayContent =
    translatedContent && !showOriginal ? translatedContent : post.content;

  return (
    <Card className="p-5 sm:p-7 bg-white border-2 border-[#111111] shadow-[4px_4px_0_#111111] transition hover:shadow-[5px_5px_0_#111111]">
      {/* Top Header: Author Info & Post Category Badge */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-[#111111]/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#111111] bg-[#F7F0D2] font-black text-sm text-[#151515] shadow-[2px_2px_0_#111111]">
            {initials || 'SB'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm sm:text-base text-[#151515]">
                {post.author.fullName}
              </h3>
              <span
                className={`inline-flex items-center gap-1 rounded-md border border-[#111111] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                  post.author.role === 'business'
                    ? 'bg-[#F2BE4E] text-[#151515]'
                    : 'bg-[#e0e7ff] text-indigo-900'
                }`}
              >
                {post.author.role === 'business' ? (
                  <>
                    <Store size={10} /> Business
                  </>
                ) : (
                  <>
                    <GraduationCap size={10} /> Student
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-[#655F52] font-medium">
              {post.author.organizationName || post.author.headline || `${post.author.role} member`}
              <span className="mx-1.5">•</span>
              <span>{formattedDate}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border-2 border-[#111111] px-2.5 py-1 text-xs font-black shadow-[1.5px_1.5px_0_#111111] ${typeMeta.bg} ${typeMeta.text}`}
          >
            <TypeIcon size={13} strokeWidth={2.5} />
            {typeMeta.label}
          </span>

          {isAuthor && (
            <button
              type="button"
              onClick={handleDeletePost}
              disabled={isDeleting}
              aria-label="Delete your post"
              className="rounded-lg border-2 border-[#111111] bg-white p-1 text-rose-700 hover:bg-rose-50 transition shadow-[1.5px_1.5px_0_#111111]"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Post Title */}
      <h4 className="mt-4 text-base sm:text-lg font-black text-[#151515]">
        {post.title}
      </h4>

      {/* Post Content */}
      <p className="mt-2 whitespace-pre-line text-xs sm:text-sm leading-relaxed text-[#151515] font-medium">
        {displayContent}
      </p>

      {/* Translation attribution & toggle */}
      {translatedContent && (
        <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-[#655F52]">
          <span>
            {showOriginal ? 'Showing original (English)' : `Translated to ${locale.toUpperCase()}`}
          </span>
          <button
            type="button"
            onClick={() => setShowOriginal(!showOriginal)}
            className="text-[#D83D63] underline hover:text-[#c22e53]"
          >
            {showOriginal ? 'View translation' : 'View original text'}
          </button>
        </div>
      )}

      {/* Skills Highlighted */}
      {post.skillsHighlighted && post.skillsHighlighted.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {post.skillsHighlighted.map((skill) => (
            <SkillBadge key={skill} name={skill} />
          ))}
        </div>
      )}

      {/* Associated SkillBridge Project Banner */}
      {post.project && (
        <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/40 p-3.5 shadow-[2px_2px_0_#111111]">
          <div className="min-w-0 pr-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#655F52]">
              Associated Project
            </span>
            <p className="truncate text-xs sm:text-sm font-black text-[#151515]">
              {post.project.title}
            </p>
          </div>
          <Link
            href={`/projects/${post.project.id}`}
            className="btn-press inline-flex shrink-0 items-center gap-1.5 rounded-lg border-2 border-[#111111] bg-white px-3 py-1.5 text-xs font-black text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F2BE4E] transition"
          >
            <span>View Brief</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      )}

      {/* Interaction Bar: Likes, Comments, Translate */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t-2 border-[#111111]/10 pt-3">
        <div className="flex items-center gap-2">
          {/* Like button */}
          <button
            type="button"
            onClick={handleToggleLike}
            className={`btn-press inline-flex items-center gap-1.5 rounded-xl border-2 border-[#111111] px-3 py-1.5 text-xs font-black shadow-[2px_2px_0_#111111] transition ${
              hasLiked
                ? 'bg-[#D83D63] text-white'
                : 'bg-white text-[#151515] hover:bg-[#F7F0D2]'
            }`}
          >
            <Heart size={14} className={hasLiked ? 'fill-current' : ''} />
            <span>{likesCount}</span>
          </button>

          {/* Comment button */}
          <button
            type="button"
            onClick={handleToggleComments}
            className="btn-press inline-flex items-center gap-1.5 rounded-xl border-2 border-[#111111] bg-white px-3 py-1.5 text-xs font-black text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F7F0D2] transition"
          >
            <MessageSquare size={14} />
            <span>{commentsCount} comments</span>
          </button>
        </div>

        {locale !== 'en' && (
          <button
            type="button"
            onClick={handleTranslate}
            disabled={isTranslating}
            className="inline-flex items-center gap-1 rounded-lg border border-[#111111] bg-white px-2.5 py-1 text-[11px] font-bold text-[#151515] shadow-[1px_1px_0_#111111] hover:bg-[#F7F0D2]"
          >
            <Languages size={12} className="text-[#D83D63]" />
            <span>{isTranslating ? 'Translating...' : translatedContent ? (showOriginal ? 'Translate' : 'Original') : `Translate to ${locale.toUpperCase()}`}</span>
          </button>
        )}
      </div>

      {/* Comments Drawer */}
      {commentsOpen && (
        <div className="mt-4 rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/25 p-4 shadow-[2px_2px_0_#111111]">
          {/* New Comment Input */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              required
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a constructive comment or question..."
              maxLength={2000}
              className="w-full rounded-xl border-2 border-[#111111] bg-white px-3 py-2 text-xs font-medium text-[#151515] outline-none focus:shadow-[2px_2px_0_#111111]"
            />
            <Button
              type="submit"
              disabled={isPostingComment || !newComment.trim()}
              className="shrink-0 text-xs font-black px-3"
            >
              <Send size={13} />
            </Button>
          </form>

          {/* Comments List */}
          <div className="mt-3 space-y-2.5">
            {comments.length === 0 ? (
              <p className="py-2 text-center text-xs text-[#655F52]">
                No comments yet. Be the first to start the discussion!
              </p>
            ) : (
              comments.map((c) => {
                const cInitials = c.author.fullName
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                const isCommentAuthor = currentProfileId && c.authorProfileId === currentProfileId;

                return (
                  <div
                    key={c.id}
                    className="flex items-start justify-between gap-2.5 rounded-lg border border-[#111111]/20 bg-white p-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[#111111] bg-[#F2BE4E] text-[10px] font-black text-[#151515]">
                        {cInitials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-[#151515] truncate">
                            {c.author.fullName}
                          </span>
                          <span className="text-[10px] text-[#655F52]">
                            {new Intl.DateTimeFormat('en-IN', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            }).format(new Date(c.createdAt))}
                          </span>
                        </div>
                        <p className="mt-1 text-[#151515] leading-relaxed break-words font-medium">
                          {c.content}
                        </p>
                      </div>
                    </div>

                    {isCommentAuthor && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-stone-400 hover:text-rose-600 transition shrink-0 p-1"
                        aria-label="Delete comment"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
