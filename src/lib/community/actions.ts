'use server';

import { revalidatePath } from 'next/cache';
import { 
  CommunityType,
  createCommunityPost, 
  deleteCommunityPost, 
  addComment, 
  deleteComment, 
  toggleReaction 
} from './service';

export async function createPostAction(communityType: CommunityType, formData: FormData) {
  const title = formData.get('title') as string;
  const body = formData.get('body') as string;
  const category = formData.get('category') as string;
  const tagsStr = formData.get('tags') as string;
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!title || !body || !category) {
    throw new Error("Missing required fields");
  }

  const postId = await createCommunityPost(communityType, title, body, category, tags);
  
  revalidatePath(`/${communityType}/community`);
  return postId;
}

export async function deletePostAction(communityType: CommunityType, postId: string) {
  const success = await deleteCommunityPost(communityType, postId);
  if (!success) {
    throw new Error("Failed to delete post or unauthorized");
  }
  revalidatePath(`/${communityType}/community`);
}

export async function createCommentAction(communityType: CommunityType, postId: string, formData: FormData) {
  const body = formData.get('body') as string;
  
  if (!body) {
    throw new Error("Comment body is required");
  }

  await addComment(communityType, postId, body);
  revalidatePath(`/${communityType}/community/${postId}`);
}

export async function toggleReactionAction(communityType: CommunityType, postId: string) {
  await toggleReaction(communityType, postId);
  revalidatePath(`/${communityType}/community`);
  revalidatePath(`/${communityType}/community/${postId}`);
}
