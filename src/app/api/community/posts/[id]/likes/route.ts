import { NextResponse } from 'next/server';
import { currentProfile } from '@/lib/auth/profile';
import { togglePostLike } from '@/lib/community/service';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await currentProfile();
    if (!auth?.profile?.id) {
      return NextResponse.json({ error: 'Please sign in to like posts.' }, { status: 401 });
    }

    const { id } = await params;
    const result = await togglePostLike(id, auth.profile.id);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Community LIKE error:', err);
    return NextResponse.json({ error: 'Failed to update like status' }, { status: 500 });
  }
}
