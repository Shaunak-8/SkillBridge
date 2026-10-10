'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Heart, Clock, ArrowLeft } from 'lucide-react';
import type { CommunityComment, CommunityPost, CommunityType } from '@/lib/community/service';
import { createCommentAction, toggleReactionAction } from '@/lib/community/actions';

interface PostDetailProps {
  type: CommunityType;
  post: CommunityPost | null;
  comments: CommunityComment[];
}

export function CommunityPostDetail({ type, post, comments }: PostDetailProps) {
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('body', commentText);
    
    try {
      await createCommentAction('shared', postData.id, formData);
      setCommentText('');
    } catch (err) {
      console.error(err);
      alert('Failed to post comment');
    }
    setLoading(false);
  };

  const handleReaction = async () => {
    try {
      await toggleReactionAction('shared', postData.id);
    } catch (err) {
      console.error(err);
    }
  };

  if (!post) {
    return (
      <div className="max-w-3xl text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Post not found</h2>
        <Link href={`/${type}/community`} className="text-[#D83D63] font-bold hover:underline">
          ← Back to community
        </Link>
      </div>
    );
  }
  const postData = post;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link 
        href={`/${type}/community`} 
        className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-[#111111]"
      >
        <ArrowLeft size={16} />
        Back to Discussions
      </Link>

      <div className="rounded-xl border-2 border-[#111111] bg-white p-6 shadow-[4px_4px_0_#111111]">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl font-black leading-tight">{postData.title}</h1>
          <span className="whitespace-nowrap rounded-md border border-[#111111] bg-[#F7F0D2] px-2.5 py-1 text-xs font-bold uppercase tracking-wider">
            {postData.category}
          </span>
        </div>

        <div className="flex items-center gap-3 mb-6 pb-6 border-b-2 border-gray-100">
          <div className="size-8 rounded-full bg-gray-200 overflow-hidden border border-[#111111]">
            {postData.author_avatar ? (
              <img src={postData.author_avatar} alt={postData.author_name} className="size-full object-cover" />
            ) : (
              <div className="size-full bg-[#D83D63] text-white flex items-center justify-center text-sm font-bold">
                {postData.author_name[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="font-bold text-[#111111]">{postData.author_name}</div>
            <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
              <Clock size={12} />
              {new Date(postData.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="prose max-w-none mb-8 whitespace-pre-wrap font-medium text-gray-800">
          {postData.body}
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleReaction}
            className="flex items-center gap-2 rounded-lg border-2 border-[#111111] px-3 py-1.5 text-sm font-bold shadow-[2px_2px_0_#111111] hover:translate-y-0.5 hover:shadow-none transition-all"
          >
            <Heart size={16} />
            Like
          </button>
        </div>
      </div>

      <div className="rounded-xl border-2 border-[#111111] bg-[#F7F0D2] p-6 shadow-[4px_4px_0_#111111]">
        <h3 className="text-xl font-black mb-4 flex items-center gap-2">
          <MessageSquare size={20} />
          Comments
        </h3>

        <form onSubmit={handleComment} className="mb-8">
          <textarea 
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            required
            rows={3}
            placeholder="Add a comment..."
            className="w-full rounded-lg border-2 border-[#111111] p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#D83D63] mb-3"
          />
          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={loading || !commentText.trim()}
              className="rounded-lg border-2 border-[#111111] bg-[#D83D63] px-4 py-2 text-sm font-bold text-white shadow-[2px_2px_0_#111111] transition-all hover:translate-y-0.5 hover:shadow-none disabled:opacity-50"
            >
              {loading ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          {comments.map(comment => (
            <div key={comment.id} className="rounded-lg border-2 border-[#111111] bg-white p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="size-6 rounded-full bg-gray-200 overflow-hidden border border-[#111111]">
                  {comment.author_avatar ? (
                    <img src={comment.author_avatar} alt={comment.author_name} className="size-full object-cover" />
                  ) : (
                    <div className="size-full bg-[#D83D63] text-white flex items-center justify-center text-xs font-bold">
                      {comment.author_name[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="font-bold text-sm text-[#111111]">{comment.author_name}</span>
                <span className="text-xs font-medium text-gray-500">
                  {new Date(comment.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap ml-9">
                {comment.body}
              </p>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-center text-sm font-medium text-gray-600 py-4">No comments yet. Be the first!</p>
          )}
        </div>
      </div>
    </div>
  );
}
