import { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, Trophy, Users2, ArrowRight, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui';
import { currentProfile } from '@/lib/auth/profile';
import { getCommunityFeed } from '@/lib/community/service';
import { CommunityFeed } from '@/components/community/CommunityFeed';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Community - SkillBridge',
  description: 'Professional community showcasing real student accomplishments, business milestones, and project deliveries.',
};

export default async function CommunityPage() {
  const [auth, posts] = await Promise.all([
    currentProfile(),
    getCommunityFeed({ limit: 30 }),
  ]);

  const currentProfileId = auth?.profile?.id ?? null;
  const currentUserRole = auth?.profile?.role ?? null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* NeoFlux Community Hero Banner */}
      <div className="mb-8 rounded-2xl border-2 border-[#111111] bg-white p-6 sm:p-8 shadow-[5px_5px_0_#111111]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#111111] bg-[#F2BE4E] px-3 py-1 text-xs font-black uppercase tracking-wider text-[#151515] shadow-[2px_2px_0_#111111]">
              <Sparkles size={14} className="text-[#D83D63]" />
              Professional Community
            </div>
            <h1 className="mt-3 text-2xl sm:text-4xl font-black text-[#151515] tracking-tight">
              Real Work. Real Milestones. Real Growth.
            </h1>
            <p className="mt-2 text-xs sm:text-sm font-medium leading-relaxed text-[#655F52]">
              A collaborative network where students showcase verified deliverables, businesses share digital transformations, and local builders connect.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {currentUserRole === 'student' ? (
              <Link
                href="/student/dashboard"
                className="btn-press inline-flex items-center gap-2 rounded-xl border-2 border-[#111111] bg-[#F7F0D2] px-4 py-2 text-xs font-black text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F2BE4E] transition"
              >
                <span>My Dashboard</span>
                <ArrowRight size={14} />
              </Link>
            ) : currentUserRole === 'business' ? (
              <Link
                href="/business/dashboard"
                className="btn-press inline-flex items-center gap-2 rounded-xl border-2 border-[#111111] bg-[#F7F0D2] px-4 py-2 text-xs font-black text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F2BE4E] transition"
              >
                <span>Business Hub</span>
                <ArrowRight size={14} />
              </Link>
            ) : (
              <Link
                href="/register"
                className="btn-press inline-flex items-center gap-2 rounded-xl border-2 border-[#111111] bg-[#D83D63] px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[2px_2px_0_#111111] hover:bg-[#c22e53] transition"
              >
                <span>Join SkillBridge</span>
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Feed + Community Guidelines & Highlights Sidebar */}
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Central Feed */}
        <div className="min-w-0">
          <CommunityFeed
            initialPosts={posts}
            currentProfileId={currentProfileId}
            currentUserRole={currentUserRole}
          />
        </div>

        {/* Sidebar Info & Standards */}
        <aside className="space-y-6">
          {/* Community Standards Card */}
          <Card className="p-6 bg-white border-2 border-[#111111] shadow-[4px_4px_0_#111111]">
            <div className="flex items-center gap-2 border-b-2 border-[#111111]/10 pb-3">
              <div className="flex size-8 items-center justify-center rounded-lg border border-[#111111] bg-[#F2BE4E]">
                <ShieldCheck size={16} className="text-[#151515]" />
              </div>
              <h2 className="text-sm font-black text-[#151515]">Community Principles</h2>
            </div>
            <ul className="mt-4 space-y-3 text-xs font-medium text-[#151515]">
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-[#D83D63]" />
                <span><strong>Share Authentic Work:</strong> Highlight projects you actually designed, coded, or deployed.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-[#D83D63]" />
                <span><strong>Celebrate Local Impact:</strong> Respect business confidentiality while showcasing measurable outcomes.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-[#D83D63]" />
                <span><strong>Constructive Feedback:</strong> Support fellow students and mentors with encouraging discussions.</span>
              </li>
            </ul>
          </Card>

          {/* Impact Stats Card */}
          <Card className="p-6 bg-[#F7F0D2]/50 border-2 border-[#111111] shadow-[4px_4px_0_#111111]">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#655F52]">
              SkillBridge Network
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border-2 border-[#111111] bg-white p-3 shadow-[2px_2px_0_#111111]">
                <span className="text-xl font-black text-[#151515]">100%</span>
                <p className="text-[10px] font-bold text-[#655F52]">Real Deliverables</p>
              </div>
              <div className="rounded-xl border-2 border-[#111111] bg-white p-3 shadow-[2px_2px_0_#111111]">
                <span className="text-xl font-black text-[#D83D63]">7+</span>
                <p className="text-[10px] font-bold text-[#655F52]">Indic Languages</p>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </main>
  );
}
