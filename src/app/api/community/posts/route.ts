import { NextResponse } from 'next/server';
import { currentProfile } from '@/lib/auth/profile';
import { getCommunityFeed, createCommunityPost, type PostType } from '@/lib/community/service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postType = searchParams.get('postType');
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const limit = Math.min(Number(searchParams.get('limit')) || 30, 50);
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

    const auth = await currentProfile();
    const currentProfileId = auth?.profile?.id ?? null;

    const posts = await getCommunityFeed({
      postType,
      role,
      search,
      currentProfileId,
      limit,
      offset,
    });

    return NextResponse.json({ posts });
  } catch (err: any) {
    console.error('Community GET feed error:', err);
    return NextResponse.json({ error: 'Failed to retrieve community feed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await currentProfile();
    if (!auth?.profile?.id) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to post.' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, postType, projectId, skillsHighlighted, mediaUrls } = body;

    const validTypes: PostType[] = [
      'completed_project',
      'achievement',
      'project_update',
      'business_milestone',
      'general',
    ];

    if (!validTypes.includes(postType)) {
      return NextResponse.json({ error: 'Invalid post type' }, { status: 400 });
    }

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return NextResponse.json({ error: 'Title must be at least 3 characters' }, { status: 400 });
    }

    if (!content || typeof content !== 'string' || content.trim().length < 5) {
      return NextResponse.json({ error: 'Content must be at least 5 characters' }, { status: 400 });
    }

    const post = await createCommunityPost({
      authorProfileId: auth.profile.id,
      postType,
      title: title.trim(),
      content: content.trim(),
      projectId: projectId || null,
      skillsHighlighted: Array.isArray(skillsHighlighted) ? skillsHighlighted : [],
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (err: any) {
    console.error('Community POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create post' }, { status: 400 });
  }
}
