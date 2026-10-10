'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  Trophy,
  CheckCircle2,
  TrendingUp,
  MessageSquare,
  Plus,
  X,
  Send,
  Link as LinkIcon,
  Layers,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import type { PostType, CommunityPost } from '@/lib/community/service';

interface PostComposerProps {
  onPostCreated: (post: CommunityPost) => void;
  currentUserRole?: string | null;
}

const POST_TYPES: { type: PostType; label: string; icon: any; description: string }[] = [
  {
    type: 'completed_project',
    label: 'Project Completed',
    icon: CheckCircle2,
    description: 'Showcase a finished project and what was delivered',
  },
  {
    type: 'achievement',
    label: 'Achievement',
    icon: Trophy,
    description: 'Share a milestone, certification, or skill accomplished',
  },
  {
    type: 'project_update',
    label: 'Project Update',
    icon: TrendingUp,
    description: 'Share ongoing progress or learnings from active work',
  },
  {
    type: 'business_milestone',
    label: 'Business Milestone',
    icon: Sparkles,
    description: 'Share a local business improvement or collaboration success',
  },
  {
    type: 'general',
    label: 'General Post',
    icon: MessageSquare,
    description: 'Share a professional discussion or industry question',
  },
];

export function PostComposer({ onPostCreated, currentUserRole }: PostComposerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [postType, setPostType] = useState<PostType>(
    currentUserRole === 'business' ? 'business_milestone' : 'completed_project'
  );
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projectsList, setProjectsList] = useState<{ id: string; title: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch accessible projects to attach
  useEffect(() => {
    if (isOpen) {
      fetch('/api/projects?limit=20')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.items) {
            setProjectsList(data.items.map((p: any) => ({ id: p.id, title: p.title })));
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || title.trim().length < 3) {
      setError('Title must be at least 3 characters.');
      return;
    }
    if (!content.trim() || content.trim().length < 5) {
      setError('Content must be at least 5 characters.');
      return;
    }

    const skillsHighlighted = skillsText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postType,
          title: title.trim(),
          content: content.trim(),
          projectId: projectId || null,
          skillsHighlighted,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish post');
      }

      onPostCreated(data.post);
      // Reset form
      setTitle('');
      setContent('');
      setSkillsText('');
      setProjectId('');
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Error publishing post');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <Card className="p-4 sm:p-5 bg-white border-2 border-[#111111] shadow-[4px_4px_0_#111111]">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#111111] bg-[#F2BE4E] font-black text-sm text-[#151515] shadow-[2px_2px_0_#111111]">
            <Plus size={20} strokeWidth={2.8} />
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="w-full text-left rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/50 px-4 py-2.5 text-xs sm:text-sm font-bold text-[#655F52] hover:bg-[#F7F0D2] transition hover:text-[#151515]"
          >
            Share a completed project, business milestone, or achievement...
          </button>
          <Button
            type="button"
            onClick={() => setIsOpen(true)}
            className="hidden sm:inline-flex shrink-0 gap-1.5 font-black text-xs"
          >
            Create Post
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6 bg-white border-2 border-[#111111] shadow-[5px_5px_0_#111111]">
      <div className="flex items-center justify-between border-b-2 border-[#111111]/10 pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-black text-[#151515]">Create Community Post</h2>
          <p className="text-xs text-[#655F52]">Showcase real outcomes, milestones, and learnings</p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-lg border-2 border-[#111111] bg-white p-1 text-[#151515] hover:bg-[#F7F0D2] transition shadow-[1.5px_1.5px_0_#111111]"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Post Type Selector */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-[#151515] mb-2">
            Select Post Category
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {POST_TYPES.map(({ type, label, icon: Icon }) => {
              const active = postType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPostType(type)}
                  className={`flex items-center gap-2 rounded-xl border-2 p-2.5 text-xs font-black transition-all text-left ${
                    active
                      ? 'border-[#111111] bg-[#F2BE4E] text-[#151515] shadow-[2.5px_2.5px_0_#111111]'
                      : 'border-[#111111]/20 bg-white text-[#655F52] hover:border-[#111111] hover:text-[#151515]'
                  }`}
                >
                  <Icon size={16} className={active ? 'text-[#D83D63]' : ''} />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-[#151515] mb-1">
            Post Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Delivered inventory dashboard for Ramesh Kirana store"
            maxLength={200}
            className="w-full rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/20 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-[#151515] outline-none focus:bg-white focus:shadow-[2px_2px_0_#111111] transition"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-[#151515] mb-1">
            Post Content
          </label>
          <textarea
            required
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share what was built, what problems were solved, technologies used, and the measurable business outcome..."
            maxLength={10000}
            className="w-full rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/20 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#151515] outline-none focus:bg-white focus:shadow-[2px_2px_0_#111111] transition resize-y"
          />
        </div>

        {/* Skills Tagging */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#151515] mb-1">
            <Layers size={13} className="text-[#D83D63]" />
            Highlighted Skills (comma separated)
          </label>
          <input
            type="text"
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            placeholder="Next.js, PostgreSQL, UI Design, WhatsApp API"
            className="w-full rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/20 px-3.5 py-2 text-xs font-bold text-[#151515] outline-none focus:bg-white focus:shadow-[2px_2px_0_#111111] transition"
          />
        </div>

        {/* Optional Project Association */}
        {projectsList.length > 0 && (
          <div>
            <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#151515] mb-1">
              <LinkIcon size={13} className="text-[#D83D63]" />
              Attach SkillBridge Project (Optional)
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/20 px-3.5 py-2 text-xs font-bold text-[#151515] outline-none focus:bg-white focus:shadow-[2px_2px_0_#111111] transition"
            >
              <option value="">-- No project link --</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div className="rounded-xl border-2 border-[#111111] bg-rose-100 p-3 text-xs font-bold text-rose-900 shadow-[2px_2px_0_#111111]">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="gap-2 font-black text-xs"
          >
            <Send size={14} />
            {isSubmitting ? 'Publishing...' : 'Publish Post'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
