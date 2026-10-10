'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CommunityType } from '@/lib/community/service';
import { createPostAction } from '@/lib/community/actions';

export function CommunityPostForm({ type }: { type: CommunityType }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const action = async (formData: FormData) => {
    setLoading(true);
    setError('');
    try {
      await createPostAction(formData);
      router.push(`/${type}/community`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-6 sm:mt-12 w-full max-w-2xl">
      <h1 className="text-3xl font-black mb-6 text-center text-[#151515]">Create a Discussion</h1>
      
      {error && (
        <div className="mb-6 rounded-lg border-2 border-red-500 bg-red-50 p-4 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      <form action={action} className="space-y-6 rounded-xl border-2 border-[#111111] bg-white p-6 sm:p-8 shadow-[4px_4px_0_#111111]">
        <div>
          <label className="mb-2 block text-xs font-black uppercase text-[#151515]">Title</label>
          <input 
            type="text" 
            name="title" 
            required 
            placeholder="What do you want to discuss?"
            className="w-full rounded-lg border-2 border-[#111111] p-3 text-sm font-bold text-[#151515] focus:outline-none focus:ring-2 focus:ring-[#D83D63]"
          />
        </div>
        
        <div>
          <label className="mb-2 block text-xs font-black uppercase text-[#151515]">Category</label>
          <select 
            name="category" 
            required
            className="w-full rounded-lg border-2 border-[#111111] p-3 text-xs font-bold text-[#151515] bg-white focus:outline-none focus:ring-2 focus:ring-[#D83D63]"
          >
            <option value="Questions">Questions</option>
            <option value="Completed Projects">Completed Projects</option>
            <option value="Achievements">Achievements</option>
            <option value="Project Updates">Project Updates</option>
            <option value="General Discussion">General Discussion</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-black uppercase text-[#151515]">Body</label>
          <textarea 
            name="body" 
            required 
            rows={6}
            placeholder="Share your thoughts, challenges, or learnings..."
            className="w-full rounded-lg border-2 border-[#111111] p-3 text-sm font-medium text-[#151515] focus:outline-none focus:ring-2 focus:ring-[#D83D63]"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-black uppercase text-[#151515]">Tags (comma-separated, optional)</label>
          <input 
            type="text" 
            name="tags" 
            placeholder="e.g. Next.js, Design, Advice"
            className="w-full rounded-lg border-2 border-[#111111] p-2 text-xs font-medium text-[#151515] focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-100">
          <button 
            type="button" 
            onClick={() => router.back()}
            className="rounded-lg px-4 py-2 text-xs font-bold text-[#655F52] hover:bg-gray-100"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="rounded-lg border-2 border-[#111111] bg-[#F2BE4E] px-6 py-2.5 text-xs font-black uppercase tracking-wider text-[#151515] shadow-[2px_2px_0_#111111] transition-all hover:translate-y-0.5 hover:shadow-none disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Publish Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
