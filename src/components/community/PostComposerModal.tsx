'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { createPostAction } from '@/lib/community/actions';

interface PostComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProjects: { id: string; title: string }[];
}

export function PostComposerModal({
  isOpen,
  onClose,
  userProjects,
}: PostComposerModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General Discussion');
  const [projectId, setProjectId] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('category', category.trim());
      formData.append('body', body.trim());
      if (projectId) formData.append('projectId', projectId);
      if (tags.trim()) formData.append('tags', tags.trim());

      await createPostAction(formData);

      // Reset form
      setTitle('');
      setBody('');
      setCategory('General Discussion');
      setProjectId('');
      setTags('');
      onClose();
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to publish post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-xl rounded-xl border-2 border-[#111111] bg-white p-6 shadow-[6px_6px_0_#111111] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-[#111111]">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md border border-[#111111] bg-[#F2BE4E] shadow-[1.5px_1.5px_0_#111111]">
              <Sparkles size={16} className="text-[#111111]" />
            </span>
            <h2 id="modal-title" className="text-xl font-black text-[#151515]">
              Create Discussion Post
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="grid size-8 place-items-center rounded-lg border border-[#111111] hover:bg-[#F7F0D2] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border-2 border-red-500 bg-red-50 p-3 text-xs font-bold text-red-700">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Post Title */}
          <div>
            <label htmlFor="post-title" className="block text-xs font-black uppercase text-[#151515] mb-1">
              Title <span className="text-[#D83D63]">*</span>
            </label>
            <input
              id="post-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              maxLength={200}
              placeholder="Give your discussion a clear, descriptive title..."
              className="w-full rounded-lg border-2 border-[#111111] p-2.5 text-sm font-bold text-[#151515] focus:outline-none focus:ring-2 focus:ring-[#D83D63]"
            />
          </div>

          {/* Category & Project Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="post-category" className="block text-xs font-black uppercase text-[#151515] mb-1">
                Category <span className="text-[#D83D63]">*</span>
              </label>
              <select
                id="post-category"
                value={category}
                onChange={e => setCategory(e.target.value)}
                required
                className="w-full rounded-lg border-2 border-[#111111] p-2.5 text-xs font-bold text-[#151515] bg-white focus:outline-none focus:ring-2 focus:ring-[#D83D63]"
              >
                <option value="Questions">Questions</option>
                <option value="Completed Projects">Completed Projects</option>
                <option value="Achievements">Achievements</option>
                <option value="Project Updates">Project Updates</option>
                <option value="General Discussion">General Discussion</option>
              </select>
            </div>

            <div>
              <label htmlFor="post-project" className="block text-xs font-black uppercase text-[#151515] mb-1">
                Linked Project <span className="text-gray-400 font-normal lowercase">(optional)</span>
              </label>
              <select
                id="post-project"
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full rounded-lg border-2 border-[#111111] p-2.5 text-xs font-bold text-[#151515] bg-white focus:outline-none focus:ring-2 focus:ring-[#D83D63]"
              >
                <option value="">None (General)</option>
                {userProjects.map(proj => (
                  <option key={proj.id} value={proj.id}>
                    {proj.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Body */}
          <div>
            <label htmlFor="post-body" className="block text-xs font-black uppercase text-[#151515] mb-1">
              Discussion Content <span className="text-[#D83D63]">*</span>
            </label>
            <textarea
              id="post-body"
              value={body}
              onChange={e => setBody(e.target.value)}
              required
              rows={5}
              maxLength={10000}
              placeholder="What questions, insights, experiences, or project feedback do you want to share with the community?"
              className="w-full rounded-lg border-2 border-[#111111] p-2.5 text-sm font-medium text-[#151515] focus:outline-none focus:ring-2 focus:ring-[#D83D63]"
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="post-tags" className="block text-xs font-black uppercase text-[#151515] mb-1">
              Tags <span className="text-gray-400 font-normal lowercase">(comma-separated, optional)</span>
            </label>
            <input
              id="post-tags"
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="e.g. Next.js, Marketing, Case Study"
              className="w-full rounded-lg border-2 border-[#111111] p-2 text-xs font-medium text-[#151515] focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border-2 border-transparent px-4 py-2 text-xs font-bold text-[#655F52] hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg border-2 border-[#111111] bg-[#F2BE4E] px-6 py-2 text-xs font-black uppercase tracking-wider text-[#151515] shadow-[2px_2px_0_#111111] hover:shadow-none hover:translate-y-0.5 transition-all disabled:opacity-50"
            >
              {loading ? 'Publishing...' : 'Publish Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
