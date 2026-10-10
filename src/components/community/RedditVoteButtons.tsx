'use client';

import { useState } from 'react';
import { ArrowBigUp, ArrowBigDown } from 'lucide-react';
import { votePostAction } from '@/lib/community/actions';

interface RedditVoteButtonsProps {
  postId: string;
  initialScore: number;
  initialUserVote: number; // 1, -1, or 0
  isCompact?: boolean;
}

export function RedditVoteButtons({
  postId,
  initialScore,
  initialUserVote,
  isCompact = false,
}: RedditVoteButtonsProps) {
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVote = async (targetVote: 1 | -1) => {
    if (loading) return;

    // Optimistic calculation
    const prevVote = userVote;
    const prevScore = score;

    let nextVote: number;
    let nextScore: number;

    if (prevVote === targetVote) {
      // Toggle off / cancel vote
      nextVote = 0;
      nextScore = prevScore - targetVote;
    } else if (prevVote === 0) {
      // New vote
      nextVote = targetVote;
      nextScore = prevScore + targetVote;
    } else {
      // Switch from -1 to 1 or 1 to -1
      nextVote = targetVote;
      nextScore = prevScore + targetVote * 2;
    }

    setUserVote(nextVote);
    setScore(nextScore);
    setLoading(true);
    setErrorMsg(null);

    try {
      const result = await votePostAction(postId, targetVote);
      setScore(result.vote_score);
      setUserVote(result.user_vote);
    } catch (err) {
      // Rollback on error
      setUserVote(prevVote);
      setScore(prevScore);
      const msg = err instanceof Error ? err.message : 'Failed to register vote';
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const isUpvoted = userVote === 1;
  const isDownvoted = userVote === -1;

  return (
    <div
      className={`flex items-center rounded-lg border-2 border-[#111111] bg-[#FDFBF7] ${
        isCompact ? 'flex-row gap-1 px-2 py-0.5' : 'flex-col justify-center px-1.5 py-2 w-11 shrink-0'
      } shadow-[2px_2px_0_#111111]`}
      role="group"
      aria-label="Post voting controls"
    >
      <button
        type="button"
        onClick={() => handleVote(1)}
        disabled={loading}
        aria-label="Upvote post"
        aria-pressed={isUpvoted}
        className={`grid size-7 place-items-center rounded transition-all ${
          isUpvoted
            ? 'bg-[#F2BE4E] text-[#111111] shadow-[1px_1px_0_#111111]'
            : 'text-[#655F52] hover:bg-[#F7F0D2] hover:text-[#111111]'
        }`}
      >
        <ArrowBigUp
          size={20}
          strokeWidth={2}
          className={isUpvoted ? 'fill-[#111111]' : ''}
        />
      </button>

      <span
        aria-live="polite"
        className={`my-0.5 text-xs font-black select-none ${
          isUpvoted
            ? 'text-[#B45309]'
            : isDownvoted
            ? 'text-[#4338CA]'
            : 'text-[#151515]'
        }`}
      >
        {score}
      </span>

      <button
        type="button"
        onClick={() => handleVote(-1)}
        disabled={loading}
        aria-label="Downvote post"
        aria-pressed={isDownvoted}
        className={`grid size-7 place-items-center rounded transition-all ${
          isDownvoted
            ? 'bg-[#E0E7FF] text-[#4338CA] shadow-[1px_1px_0_#111111]'
            : 'text-[#655F52] hover:bg-[#F7F0D2] hover:text-[#111111]'
        }`}
      >
        <ArrowBigDown
          size={20}
          strokeWidth={2}
          className={isDownvoted ? 'fill-[#4338CA]' : ''}
        />
      </button>

      {errorMsg && (
        <span role="alert" className="sr-only">
          {errorMsg}
        </span>
      )}
    </div>
  );
}
