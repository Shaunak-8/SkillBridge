'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Share2,
  Trash2,
  Edit3,
  Check,
  Briefcase,
} from 'lucide-react';
import type { CommunityPost } from '@/lib/community/service';
import { deletePostAction, updatePostAction } from '@/lib/community/actions';
import { RedditVoteButtons } from './RedditVoteButtons';

interface RedditPostCardProps {
  post: CommunityPost;
  currentUserId?: string | null;
  role?: string;
  isDetailView?: boolean;
}

export function RedditPostCard({
  post,
  currentUserId,
  role = 'student',
  isDetailView = false,
}: RedditPostCardProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editBody, setEditBody] = useState(post.body);
  const [editCategory, setEditCategory] = useState(post.category);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isOwner = Boolean(currentUserId && currentUserId === post.author_id);
  const postUrl = `/${role}/community/${post.id}`;

  const handleShare = async () => {
    try {
      const fullUrl = `${window.location.origin}${postUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this discussion post?')) return;
    setDeleting(true);
    try {
      await deletePostAction(post.id);
      if (isDetailView) {
        router.push(`/${role}/community`);
      } else {
        router.refresh();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete post');
      setDeleting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editBody.trim()) return;

    setSaving(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('title', editTitle.trim());
      formData.append('body', editBody.trim());
      formData.append('category', editCategory.trim());

      await updatePostAction(post.id, formData);
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update post');
    } finally {
      setSaving(false);
    }
  };

  const formatTimestamp = (dateInput: string | Date) => {
    try {
      const d = new Date(dateInput);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'recently';
    }
  };

  const isBusinessAuthor = post.author_role === 'business' || post.community_type === 'business';

  return (
    <article
      className="flex flex-col sm:flex-row gap-4 rounded-xl border-2 border-[#111111] bg-white p-4 sm:p-5 shadow-[3px_3px_0_#111111] transition-all hover:shadow-[5px_5px_0_#111111]"
    >
      {/* Left: Voting Column */}
      <div className="flex sm:flex-col items-center justify-between sm:justify-start">
        <RedditVoteButtons
          postId={post.id}
          initialScore={post.vote_score}
          initialUserVote={post.user_vote}
        />

        {/* Mobile author tag */}
        <div className="flex items-center gap-2 sm:hidden text-xs">
          <span className="font-bold text-[#151515]">{post.author_name}</span>
          <span className="text-[#655F52]">•</span>
          <span className="text-[#655F52]">{formatTimestamp(post.created_at)}</span>
        </div>
      </div>

      {/* Main Content Column */}
      <div className="flex-1 min-w-0">
        {/* Post Metadata Header */}
        <div className="hidden sm:flex flex-wrap items-center gap-2 mb-2 text-xs">
          {/* Avatar */}
          <div className="grid size-6 place-items-center rounded-md border border-[#111111] bg-[#D83D63] text-[10px] font-black text-white shrink-0">
            {post.author_avatar ? (
              <img
                src={post.author_avatar}
                alt={post.author_name}
                className="size-full rounded-md object-cover"
              />
            ) : (
              (post.author_name || 'SB').slice(0, 2).toUpperCase()
            )}
          </div>

          {/* Author Name */}
          <span className="font-black text-[#151515]">{post.author_name}</span>

          {/* Role Pill */}
          <span
            className={`inline-flex items-center rounded-md border-[1.5px] border-[#111111] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-[1px_1px_0_#111111] ${
              isBusinessAuthor
                ? 'bg-[#FEF3C7] text-[#92400E]'
                : 'bg-[#E0F2FE] text-[#0369A1]'
            }`}
          >
            {isBusinessAuthor ? 'Business' : 'Student'}
          </span>

          <span className="text-[#655F52]">•</span>
          <span className="text-[#655F52]">{formatTimestamp(post.created_at)}</span>

          {/* Category Pill */}
          <span className="ml-auto inline-flex items-center rounded-md border border-[#111111] bg-[#F7F0D2] px-2 py-0.5 text-[11px] font-bold text-[#151515]">
            {post.category}
          </span>
        </div>

        {/* Optional Linked Project Badge */}
        {post.project_title && (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg border-[1.5px] border-[#111111] bg-[#FFFBEB] px-2.5 py-1 text-xs font-bold text-[#92400E] shadow-[1.5px_1.5px_0_#111111]">
            <Briefcase size={13} className="text-[#B45309]" />
            <span>Linked Project:</span>
            {post.project_id ? (
              <Link
                href={`/projects/${post.project_id}`}
                className="font-black underline hover:text-[#B45309]"
              >
                {post.project_title}
              </Link>
            ) : (
              <span className="font-black">{post.project_title}</span>
            )}
          </div>
        )}

        {/* Edit Form or Post Content */}
        {isEditing ? (
          <form onSubmit={handleUpdate} className="space-y-3 mb-4 mt-2">
            {errorMsg && (
              <div className="rounded border-2 border-red-500 bg-red-50 p-2 text-xs font-bold text-red-600">
                {errorMsg}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold mb-1 text-[#151515]">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                required
                className="w-full rounded-lg border-2 border-[#111111] p-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D83D63]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-[#151515]">Category</label>
              <select
                value={editCategory}
                onChange={e => setEditCategory(e.target.value)}
                className="w-full rounded-lg border-2 border-[#111111] p-2 text-xs font-bold focus:outline-none"
              >
                <option value="Questions">Questions</option>
                <option value="Completed Projects">Completed Projects</option>
                <option value="Achievements">Achievements</option>
                <option value="Project Updates">Project Updates</option>
                <option value="General Discussion">General Discussion</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-[#151515]">Body</label>
              <textarea
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                rows={4}
                required
                className="w-full rounded-lg border-2 border-[#111111] p-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#D83D63]"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg border-2 border-[#111111] bg-[#F2BE4E] px-4 py-1.5 text-xs font-bold text-[#151515] shadow-[2px_2px_0_#111111] hover:shadow-none hover:translate-y-0.5 transition-all"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-lg border border-transparent px-3 py-1.5 text-xs font-bold text-[#655F52] hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Title */}
            {isDetailView ? (
              <h1 className="mb-2 text-xl sm:text-2xl font-black text-[#151515] leading-snug">
                {post.title}
              </h1>
            ) : (
              <h2 className="mb-2 text-base sm:text-lg font-black text-[#151515] leading-snug hover:text-[#D83D63] transition-colors">
                <Link href={postUrl}>{post.title}</Link>
              </h2>
            )}

            {/* Body */}
            <p
              className={`text-sm text-[#37332C] leading-relaxed whitespace-pre-wrap font-medium mb-4 ${
                !isDetailView ? 'line-clamp-3' : ''
              }`}
            >
              {post.body}
            </p>
          </>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs">
          {/* Comments link */}
          <Link
            href={postUrl}
            className="flex items-center gap-1.5 rounded-md border-[1.5px] border-[#111111] bg-[#F7F0D2] px-2.5 py-1 font-bold text-[#151515] shadow-[1.5px_1.5px_0_#111111] hover:bg-[#F2BE4E] transition-all"
          >
            <MessageSquare size={13} strokeWidth={2.2} />
            <span>
              {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
            </span>
          </Link>

          {/* Share button */}
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-md border-[1.5px] border-[#111111] bg-white px-2.5 py-1 font-bold text-[#151515] shadow-[1.5px_1.5px_0_#111111] hover:bg-[#F7F0D2] transition-all"
          >
            {copied ? (
              <>
                <Check size={13} strokeWidth={2.5} className="text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Share2 size={13} strokeWidth={2.2} />
                <span>Share</span>
              </>
            )}
          </button>

          {/* Post Ownership Controls */}
          {isOwner && (
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-1 rounded-md border border-[#111111] bg-white px-2 py-0.5 text-xs font-bold text-[#151515] hover:bg-[#F7F0D2]"
              >
                <Edit3 size={12} />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1 rounded-md border border-[#111111] bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600 hover:bg-red-100"
              >
                <Trash2 size={12} />
                <span>{deleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
