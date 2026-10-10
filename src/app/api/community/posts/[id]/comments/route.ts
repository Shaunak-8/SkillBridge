import { NextResponse } from 'next/server';
import { currentProfile } from '@/lib/auth/profile';
import { getPostComments, addPostComment } from '@/lib/community/service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const comments = await getPostComments(id);
    return NextResponse.json({ comments });
  } catch (err: any) {
    console.error('Community GET comments error:', err);
    return NextResponse.json({ error: 'Failed to retrieve comments' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await currentProfile();
    if (!auth?.profile?.id) {
      return NextResponse.json({ error: 'Please sign in to leave a comment.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment cannot be empty.' }, { status: 400 });
    }

    const comment = await addPostComment(id, auth.profile.id, content.trim());
    return NextResponse.json({ comment }, { status: 201 });
  } catch (err: any) {
    console.error('Community POST comment error:', err);
    return NextResponse.json({ error: err.message || 'Failed to post comment' }, { status: 400 });
  }
}
