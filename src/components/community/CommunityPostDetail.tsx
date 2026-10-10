'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MessageSquare,
  Trash2,
  Send,
  AlertCircle,
} from 'lucide-react';
import type { CommunityComment, CommunityPost } from '@/lib/community/service';
import { createCommentAction, deleteCommentAction } from '@/lib/community/actions';
import { RedditPostCard } from './RedditPostCard';

interface CommunityPostDetailProps {
  post: CommunityPost | null;
  comments: CommunityComment[];
  currentUserId?: string | null;
  role: 'student' | 'business';
}

export function CommunityPostDetail({
  post,
  comments,
  currentUserId,
  role,
}: CommunityPostDetailProps) {
  const router = useRouter();
  const [commentBody, setCommentBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!post) {
    return (
      <div className="rounded-2xl border-2 border-[#111111] bg-white p-12 text-center shadow-[4px_4px_0_#111111]">
        <h2 className="text-2xl font-black text-[#151515] mb-2">Post not found</h2>
        <p className="text-sm font-medium text-[#655F52] mb-6">
          This discussion post may have been removed or does not exist.
        </p>
        <Link
          href={`/${role}/community`}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[#111111] bg-[#F2BE4E] px-4 py-2 text-xs font-black uppercase text-[#151515] shadow-[2px_2px_0_#111111]"
        >
          <ArrowLeft size={14} />
          Return to Community
        </Link>
      </div>
    );
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('body', commentBody.trim());

      await createCommentAction(post.id, formData);
      setCommentBody('');
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    setDeletingId(commentId);
    try {
      await deleteCommentAction(commentId, post.id);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete comment');
    } finally {
      setDeletingId(null);
    }
  };

  const formatTimestamp = (dateInput: string | Date) => {
    try {
      const d = new Date(dateInput);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return 'recently';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back to Community Link */}
      <Link
        href={`/${role}/community`}
        className="inline-flex items-center gap-2 rounded-lg border-[1.5px] border-[#111111] bg-white px-3 py-1.5 text-xs font-bold text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F7F0D2] transition-colors"
      >
        <ArrowLeft size={14} strokeWidth={2.5} />
        <span>Back to Community</span>
      </Link>

      {/* Main Post Card */}
      <RedditPostCard
        post={post}
        currentUserId={currentUserId}
        role={role}
        isDetailView={true}
      />

      {/* Discussion & Comments Area */}
      <section
        aria-label="Discussion comments"
        className="rounded-2xl border-2 border-[#111111] bg-white p-6 sm:p-8 shadow-[4px_4px_0_#111111]"
      >
        <div className="flex items-center gap-2.5 pb-4 mb-6 border-b-2 border-[#111111]">
          <div className="grid size-8 place-items-center rounded-lg border border-[#111111] bg-[#F7F0D2] shadow-[1.5px_1.5px_0_#111111]">
            <MessageSquare size={16} className="text-[#151515]" />
          </div>
          <h2 className="text-xl font-black text-[#151515]">
            Discussion ({comments.length})
          </h2>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border-2 border-red-500 bg-red-50 p-3 text-xs font-bold text-red-700">
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Comment Submission Form */}
        <form onSubmit={handleAddComment} className="mb-8 space-y-3">
          <label htmlFor="comment-text" className="block text-xs font-black uppercase text-[#151515]">
            Add to the discussion
          </label>
          <textarea
            id="comment-text"
            value={commentBody}
            onChange={e => setCommentBody(e.target.value)}
            required
            rows={3}
            placeholder="Share your perspective, experience, or ask a question..."
            className="w-full rounded-xl border-2 border-[#111111] p-3 text-sm font-medium text-[#151515] focus:outline-none focus:ring-2 focus:ring-[#D83D63]"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !commentBody.trim()}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-[#111111] bg-[#F2BE4E] px-5 py-2 text-xs font-black uppercase tracking-wider text-[#151515] shadow-[2px_2px_0_#111111] hover:shadow-none hover:translate-y-0.5 transition-all disabled:opacity-50"
            >
              <Send size={13} strokeWidth={2.5} />
              <span>{submitting ? 'Posting...' : 'Post Comment'}</span>
            </button>
          </div>
        </form>

        {/* Comment Thread List */}
        {comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#111111] bg-[#FAF8F5] p-8 text-center">
            <p className="text-sm font-medium text-[#655F52]">
              No responses yet. Be the first to start the conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map(c => {
              const isCommentOwner = Boolean(currentUserId && currentUserId === c.author_id);
              const isBusiness = c.author_role === 'business';

              return (
                <div
                  key={c.id}
                  className="rounded-xl border-2 border-[#111111] bg-[#FAF8F5] p-4 shadow-[2px_2px_0_#111111]"
                >
                  {/* Comment Author Header */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <div className="grid size-6 place-items-center rounded-md border border-[#111111] bg-[#D83D63] text-[10px] font-black text-white shrink-0">
                      {c.author_avatar ? (
                        <img
                          src={c.author_avatar}
                          alt={c.author_name}
                          className="size-full rounded-md object-cover"
                        />
                      ) : (
                        (c.author_name || 'SB').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <span className="text-xs font-black text-[#151515]">{c.author_name}</span>
                    <span
                      className={`inline-flex items-center rounded-md border border-[#111111] px-1.5 py-0.2 text-[9px] font-black uppercase ${
                        isBusiness
                          ? 'bg-[#FEF3C7] text-[#92400E]'
                          : 'bg-[#E0F2FE] text-[#0369A1]'
                      }`}
                    >
                      {isBusiness ? 'Business' : 'Student'}
                    </span>
                    <span className="text-[#655F52] text-xs">•</span>
                    <span className="text-xs text-[#655F52]">{formatTimestamp(c.created_at)}</span>

                    {/* Delete Comment button */}
                    {isCommentOwner && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(c.id)}
                        disabled={deletingId === c.id}
                        className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-800"
                        title="Delete comment"
                      >
                        <Trash2 size={12} />
                        <span>{deletingId === c.id ? 'Deleting...' : 'Delete'}</span>
                      </button>
                    )}
                  </div>

                  {/* Comment Body */}
                  <p className="text-sm font-medium text-[#37332C] leading-relaxed whitespace-pre-wrap pl-8">
                    {c.body}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
