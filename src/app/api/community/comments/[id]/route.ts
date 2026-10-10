import { NextResponse } from 'next/server';
import { currentProfile } from '@/lib/auth/profile';
import { deletePostComment } from '@/lib/community/service';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await currentProfile();
    if (!auth?.profile?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const success = await deletePostComment(id, auth.profile.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Comment not found or you are not authorized to delete it.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Community DELETE comment error:', err);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
