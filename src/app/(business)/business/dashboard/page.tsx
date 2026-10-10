import Link from 'next/link';
import {
  FolderKanban,
  FilePenLine,
  Send,
  Users,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { WelcomeBanner } from '@/components/shared/WelcomeBanner';
import { ProjectList, actionClass } from '@/components/business/ProjectList';
import { businessPage } from '@/lib/business/pages';
import { dashboardCounts, listProjects } from '@/lib/business/service';

export default async function Page() {
  const { owner, business } = await businessPage();
  const [counts, projects] = await Promise.all([
    dashboardCounts(owner),
    listProjects(owner),
  ]);

  return (
    <div className="space-y-8">
      {/* NeoFlux Welcome Banner */}
      <WelcomeBanner
        role="business"
        userName={business.business_name}
        title="Turn business challenges into student projects."
        highlightWord="projects"
        description="Describe what is difficult or slow in your day-to-day operations. SkillBridge turns your problem into a structured brief and matches you with verified student problem solvers."
        primaryActionLabel="Post a Problem"
        primaryActionHref="/business/projects/new"
        secondaryActionLabel="Find Students"
        secondaryActionHref="/business/screening"
        badgeText="• Verified Local MSMEs"
      />

      {/* KPI Overview Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Projects"
          value={String(counts.total)}
          detail="All created briefs"
          icon={FolderKanban}
        />
        <StatCard
          label="Draft Projects"
          value={String(counts.drafts)}
          detail={counts.drafts > 0 ? "Ready to review & publish" : "No pending drafts"}
          icon={FilePenLine}
        />
        <StatCard
          label="Published Projects"
          value={String(counts.published)}
          detail="Active for student discovery"
          icon={Send}
        />
        <StatCard
          label="Applications"
          value={String(counts.applications)}
          detail="Across all active projects"
          icon={Users}
        />
      </div>

      {/* AI Project Creation Invitation Card */}
      <div className="rounded-2xl border-2 border-[#111111] bg-white p-6 shadow-[4px_4px_0_#111111]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b-2 border-[#111111]/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl border-2 border-[#111111] bg-[#F2BE4E] shadow-[2px_2px_0_#111111]">
              <Sparkles size={22} className="text-[#151515]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#151515]">
                Have a business challenge? Tell us about it.
              </h3>
              <p className="text-xs text-[#655F52]">
                You don’t need technical jargon. Describe what is broken or slow in everyday language.
              </p>
            </div>
          </div>
          <Link href="/business/projects/new" className={actionClass}>
            Generate Project Brief <ArrowRight size={14} className="ml-1.5" />
          </Link>
        </div>

        {/* Examples & What AI Produces */}
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/50 p-3.5 shadow-[2px_2px_0_#111111]">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#D83D63]">
              Example #1 · Retail & Orders
            </span>
            <p className="mt-1 text-xs text-[#151515] italic">
              &ldquo;We take 50 WhatsApp orders daily on paper and lose track of payments and deliveries.&rdquo;
            </p>
          </div>
          <div className="rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/50 p-3.5 shadow-[2px_2px_0_#111111]">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#D83D63]">
              Example #2 · Marketing & Reach
            </span>
            <p className="mt-1 text-xs text-[#151515] italic">
              &ldquo;We need high-quality product photos and an automated Instagram catalogue for festive season.&rdquo;
            </p>
          </div>
          <div className="rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/50 p-3.5 shadow-[2px_2px_0_#111111]">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#D83D63]">
              Example #3 · Operations
            </span>
            <p className="mt-1 text-xs text-[#151515] italic">
              &ldquo;We want a simple barcode scanning tool on phones to count warehouse boxes accurately.&rdquo;
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] font-medium text-[#655F52] bg-[#F7F0D2]/25 rounded-lg border border-[#111111]/20 p-2.5">
          <span className="font-bold text-[#151515]">AI generates for you:</span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 size={13} className="text-[#D83D63]" /> Clear Deliverables
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 size={13} className="text-[#D83D63]" /> Required Skills
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 size={13} className="text-[#D83D63]" /> Timeline & Scope
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 size={13} className="text-[#D83D63]" /> Ready-to-Publish Brief
          </span>
        </div>
      </div>

      {/* Projects List Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-[#151515]">Recent Projects</h2>
            <p className="text-xs text-[#655F52]">
              Track your active challenges, drafts, and incoming student applications.
            </p>
          </div>
          <Link
            className="btn-press inline-flex items-center gap-1 rounded-xl border-2 border-[#111111] bg-white px-3.5 py-2 text-xs font-bold text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F7F0D2]"
            href="/business/projects"
          >
            View all projects ({counts.total})
          </Link>
        </div>

        <ProjectList projects={projects.slice(0, 6)} />
      </div>
    </div>
  );
}

