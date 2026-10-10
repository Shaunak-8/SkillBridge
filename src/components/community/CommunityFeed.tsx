import Link from 'next/link';
import { MessageSquare, Heart, Clock } from 'lucide-react';
import type { CommunityType } from '@/lib/community/service';

interface Post {
  id: string;
  author_id: string;
  title: string;
  body: string;
  category: string;
  created_at: Date;
  author_name: string;
  author_avatar?: string | null;
  comment_count: number;
  like_count: number;
}

export function CommunityFeed({ type, posts }: { type: CommunityType; posts: Post[] }) {
  return (
    <div className="mx-auto space-y-6 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black mb-2">
            {type === 'student' ? 'Student Community' : 'Business Community'}
          </h1>
          <p className="text-gray-600 font-medium">
            {type === 'student' 
              ? 'Discuss experiences, projects, and advice with fellow students.' 
              : 'Discuss hiring, projects, and share advice with other businesses.'}
          </p>
        </div>
        <Link 
          href={`/${type}/community/new`}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border-2 border-[#111111] bg-[#F2BE4E] px-4 py-2 font-bold text-[#151515] shadow-[2px_2px_0_#111111] transition-all hover:translate-y-0.5 hover:shadow-none"
        >
          New Post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border-2 border-[#111111] bg-white p-8 text-center shadow-[4px_4px_0_#111111]">
          <MessageSquare className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="text-xl font-bold mb-2">No posts yet</h3>
          <p className="text-gray-600 mb-6">Be the first to start a discussion in the {type} community.</p>
          <Link 
            href={`/${type}/community/new`}
            className="inline-flex font-bold text-[#D83D63] hover:underline"
          >
            Create the first post →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <Link 
              key={post.id} 
              href={`/${type}/community/${post.id}`}
              className="block rounded-xl border-2 border-[#111111] bg-white p-5 shadow-[4px_4px_0_#111111] transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0_#111111]"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3 className="text-xl font-bold">{post.title}</h3>
                <span className="whitespace-nowrap rounded-md border border-[#111111] bg-[#F7F0D2] px-2.5 py-1 text-xs font-bold uppercase tracking-wider">
                  {post.category}
                </span>
              </div>
              <p className="line-clamp-2 text-gray-700 mb-4">{post.body}</p>
              
              <div className="flex items-center gap-6 text-sm font-medium text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-gray-200 overflow-hidden border border-[#111111]">
                    {post.author_avatar ? (
                      <img src={post.author_avatar} alt={post.author_name} className="size-full object-cover" />
                    ) : (
                      <div className="size-full bg-[#D83D63] text-white flex items-center justify-center text-xs font-bold">
                        {post.author_name[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-[#111111] font-bold">{post.author_name}</span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <MessageSquare size={16} />
                  {post.comment_count}
                </div>
                
                <div className="flex items-center gap-1.5">
                  <Heart size={16} />
                  {post.like_count}
                </div>
                
                <div className="flex items-center gap-1.5 ml-auto">
                  <Clock size={16} />
                  {new Date(post.created_at).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
