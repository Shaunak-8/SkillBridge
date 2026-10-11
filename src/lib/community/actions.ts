'use server';

import { revalidatePath } from 'next/cache';
import {
  createCommunityPost,
  updateCommunityPost,
  deleteCommunityPost,
  addComment,
  deleteComment,
  castVote,
  toggleReaction,
  VoteResult,
} from './service';

export async function createPostAction(
  typeOrFormData: string | FormData,
  maybeFormData?: FormData
) {
  const formData = maybeFormData || (typeOrFormData as FormData);
  const title = (formData.get('title') as string)?.trim();
  const body = (formData.get('body') as string)?.trim();
  const category = (formData.get('category') as string)?.trim() || 'General Discussion';
  const tagsStr = (formData.get('tags') as string)?.trim();
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
  const projectId = (formData.get('projectId') as string)?.trim() || null;

  if (!title) {
    throw new Error('Title is required');
  }
  if (!body) {
    throw new Error('Post content is required');
  }

  const postId = await createCommunityPost(title, body, category, tags, projectId);

  revalidatePath('/student/community');
  revalidatePath('/business/community');
  revalidatePath('/community');
  return postId;
}

export async function updatePostAction(postId: string, formData: FormData) {
  const title = (formData.get('title') as string)?.trim();
  const body = (formData.get('body') as string)?.trim();
  const category = (formData.get('category') as string)?.trim() || 'General Discussion';

  if (!title) throw new Error('Title is required');
  if (!body) throw new Error('Post content is required');

  const success = await updateCommunityPost(postId, title, body, category);
  if (!success) throw new Error('Failed to update post or unauthorized');

  revalidatePath('/student/community');
  revalidatePath('/business/community');
  revalidatePath(`/student/community/${postId}`);
  revalidatePath(`/business/community/${postId}`);
  revalidatePath('/community');
}

export async function deletePostAction(postIdOrScope: string, maybePostId?: string) {
  const postId = maybePostId || postIdOrScope;
  const success = await deleteCommunityPost(postId);
  if (!success) {
    throw new Error('Failed to delete post or unauthorized');
  }

  revalidatePath('/student/community');
  revalidatePath('/business/community');
  revalidatePath('/community');
}

export async function votePostAction(postId: string, voteValue: 1 | -1): Promise<VoteResult> {
  const result = await castVote(postId, voteValue);

  revalidatePath('/student/community');
  revalidatePath('/business/community');
  revalidatePath(`/student/community/${postId}`);
  revalidatePath(`/business/community/${postId}`);
  revalidatePath('/community');

  return result;
}

export async function createCommentAction(
  postIdOrScope: string,
  postIdOrFormData: string | FormData,
  maybeFormData?: FormData
) {
  let postId: string;
  let formData: FormData;

  if (typeof postIdOrFormData === 'string') {
    postId = postIdOrFormData;
    formData = maybeFormData!;
  } else {
    postId = postIdOrScope;
    formData = postIdOrFormData;
  }

  const body = (formData.get('body') as string)?.trim();
  const parentCommentId = (formData.get('parentCommentId') as string)?.trim() || null;

  if (!body) {
    throw new Error('Comment body is required');
  }

  const commentId = await addComment(postId, body, parentCommentId);

  revalidatePath('/student/community');
  revalidatePath('/business/community');
  revalidatePath(`/student/community/${postId}`);
  revalidatePath(`/business/community/${postId}`);
  revalidatePath('/community');

  return commentId;
}

export async function deleteCommentAction(commentId: string, postId: string) {
  const success = await deleteComment(commentId);
  if (!success) {
    throw new Error('Failed to delete comment or unauthorized');
  }

  revalidatePath(`/student/community/${postId}`);
  revalidatePath(`/business/community/${postId}`);
  revalidatePath('/student/community');
  revalidatePath('/business/community');
}

export async function toggleReactionAction(scopeOrPostId: string, maybePostId?: string) {
  const postId = maybePostId || scopeOrPostId;
  await toggleReaction(postId);
  revalidatePath('/student/community');
  revalidatePath('/business/community');
  revalidatePath(`/student/community/${postId}`);
  revalidatePath(`/business/community/${postId}`);
}
