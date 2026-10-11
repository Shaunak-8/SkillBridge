export async function createPostAction() {
  return 'post-mock-id';
}

export async function updatePostAction() {}

export async function deletePostAction() {}

export async function votePostAction(postId: string, voteValue: 1 | -1) {
  return {
    vote_score: 25,
    upvote_count: 25,
    downvote_count: 0,
    user_vote: voteValue,
  };
}

export async function createCommentAction() {
  return 'comment-mock-id';
}

export async function deleteCommentAction() {}

export async function toggleReactionAction() {}
