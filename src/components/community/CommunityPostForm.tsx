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
      await createPostAction(type, formData);
      router.push(`/${type}/community`);
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-10 sm:mt-20 w-full max-w-2xl">
      <h1 className="text-3xl font-black mb-6 text-center text-[#151515]">Create a Post</h1>
      
      {error && (
        <div className="mb-6 rounded-lg border-2 border-red-500 bg-red-50 p-4 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      <form action={action} className="space-y-6 rounded-xl border-2 border-[#111111] bg-white p-6 shadow-[4px_4px_0_#111111]">
        <div>
          <label className="mb-2 block text-sm font-bold text-[#151515]">Title</label>
          <input 
            type="text" 
            name="title" 
            required 
            placeholder="What do you want to discuss?"
            className="w-full rounded-lg border-2 border-[#111111] p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#D83D63]"
          />
        </div>
        
        <div>
          <label className="mb-2 block text-sm font-bold text-[#151515]">Category</label>
          <select 
            name="category" 
            required
            className="w-full rounded-lg border-2 border-[#111111] p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#D83D63]"
          >
            {type === 'student' ? (
              <>
                <option value="Business Experiences">Business Experiences</option>
                <option value="Project Reviews">Project Reviews</option>
                <option value="Application Advice">Application Advice</option>
                <option value="Questions & Help">Questions & Help</option>
                <option value="General Discussion">General Discussion</option>
              </>
            ) : (
              <>
                <option value="Hiring Experiences">Hiring Experiences</option>
                <option value="Project Outcomes">Project Outcomes</option>
                <option value="Questions & Help">Questions & Help</option>
                <option value="General Discussion">General Discussion</option>
              </>
            )}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-[#151515]">Body</label>
          <textarea 
            name="body" 
            required 
            rows={6}
            placeholder="Share your thoughts..."
            className="w-full rounded-lg border-2 border-[#111111] p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#D83D63]"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-100">
          <button 
            type="button" 
            onClick={() => router.back()}
            className="rounded-lg px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="rounded-lg border-2 border-[#111111] bg-[#D83D63] px-6 py-2 text-sm font-bold text-white shadow-[2px_2px_0_#111111] transition-all hover:translate-y-0.5 hover:shadow-none disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Post Discussion'}
          </button>
        </div>
      </form>
    </div>
  );
}
