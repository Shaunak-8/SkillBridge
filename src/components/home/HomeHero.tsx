'use client';

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  FolderOpen,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import type { HomepageData } from "@/lib/projects/homepage";
import { ProjectCard } from "@/components/shared/ProjectCard";
import { useLanguage } from "@/lib/i18n/context";

export function HomeHero({ data }: { data: HomepageData }) {
  const { t } = useLanguage();
  const { featuredProjects, state, stats } = data;

  return (
    <section className="mx-auto max-w-7xl px-5 pt-8 pb-16 sm:px-8 sm:pt-12 sm:pb-20">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-12">
        {/* LEFT COLUMN: Hero Pitch & CTAs */}
        <div className="flex flex-col justify-center">
          {/* Badge */}
          <div className="inline-flex w-fit items-center gap-2 rounded-md border-[1.5px] border-[#111111] bg-[#FCE8ED] px-3 py-1 text-xs font-black uppercase tracking-wider text-[#D83D63] shadow-[2px_2px_0_#111111]">
            <Sparkles size={14} className="text-[#D83D63]" />
            <span>Skills over degrees</span>
          </div>

          {/* Heading */}
          <h1 className="mt-5 text-4xl font-black leading-[1.08] tracking-tight text-[#151515] sm:text-5xl lg:text-6xl text-balance">
            Good problems deserve{" "}
            <span className="text-[#D83D63] underline decoration-[#F2BE4E] decoration-4 underline-offset-4">
              curious people.
            </span>
          </h1>

          {/* Supporting Description */}
          <p className="mt-5 max-w-xl text-base font-medium leading-relaxed text-[#655F52] sm:text-lg">
            SkillBridge connects local businesses with students ready to turn real-world challenges into meaningful, verified projects and career-defining portfolios.
          </p>

          {/* Primary & Secondary Actions */}
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3.5">
            <Link
              href="/projects"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#111111] bg-[#F2BE4E] px-5 py-3 text-sm font-black text-[#151515] shadow-[3px_3px_0_#111111] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#111111]"
            >
              <span>{t('explore_projects')}</span>
              <ArrowRight size={17} strokeWidth={2.5} />
            </Link>

            <Link
              href="/about"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#111111] bg-white px-5 py-3 text-sm font-black text-[#151515] shadow-[3px_3px_0_#111111] transition-all hover:-translate-y-0.5 hover:bg-[#F7F0D2] hover:shadow-[5px_5px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#111111]"
            >
              <span>{t('how_it_works')}</span>
            </Link>

            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#111111] bg-[#FCE8ED] px-4 py-3 text-sm font-black text-[#D83D63] shadow-[3px_3px_0_#111111] transition-all hover:-translate-y-0.5 hover:bg-[#D83D63] hover:text-white hover:shadow-[5px_5px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#111111]"
            >
              <span>{t('for_businesses')}</span>
            </Link>
          </div>

          {/* Real Statistics from Database (Only shown when verifiable data exists) */}
          {stats && (stats.openProjects > 0 || stats.studentCount > 0 || stats.businessCount > 0) && (
            <div className="mt-8 grid grid-cols-3 gap-3 border-y-2 border-[#111111] py-4">
              <div>
                <p className="text-2xl font-black text-[#151515] sm:text-3xl">
                  {stats.openProjects}
                </p>
                <p className="text-xs font-bold text-[#655F52]">Open Projects</p>
              </div>
              <div>
                <p className="text-2xl font-black text-[#D83D63] sm:text-3xl">
                  {stats.businessCount}
                </p>
                <p className="text-xs font-bold text-[#655F52]">Businesses</p>
              </div>
              <div>
                <p className="text-2xl font-black text-[#151515] sm:text-3xl">
                  {stats.studentCount}
                </p>
                <p className="text-xs font-bold text-[#655F52]">Students</p>
              </div>
            </div>
          )}

          {/* Trust Indicators */}
          <div className="mt-7 flex flex-wrap items-center gap-y-2 gap-x-5 text-xs font-bold text-[#655F52]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-[#10b981]" strokeWidth={2.5} />
              <span>100% Free for Students</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-[#10b981]" strokeWidth={2.5} />
              <span>Verified Business Briefs</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-[#10b981]" strokeWidth={2.5} />
              <span>Skills-First Evaluation</span>
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Fresh Opportunities Panel */}
        <div className="relative">
          <div className="rounded-2xl border-2 border-[#111111] bg-white p-5 shadow-[6px_6px_0_#111111] sm:p-6">
            {/* Panel Header */}
            <div className="mb-4 flex items-center justify-between border-b-2 border-[#111111] pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#10b981] animate-pulse" />
                  <p className="text-xs font-black uppercase tracking-wider text-[#D83D63]">
                    Fresh Opportunities
                  </p>
                </div>
                <h2 className="mt-1 text-lg font-black text-[#151515] sm:text-xl">
                  Live Business Challenges
                </h2>
              </div>

              <Link
                href="/projects"
                className="inline-flex items-center gap-1 rounded-md border-[1.5px] border-[#111111] bg-[#F7F0D2] px-2.5 py-1 text-xs font-bold text-[#151515] shadow-[1.5px_1.5px_0_#111111] hover:bg-[#F2BE4E]"
              >
                <span>Browse all</span>
                <ArrowUpRight size={13} />
              </Link>
            </div>

            {/* Panel Content: Real Database Projects, Empty State, or Unavailable State */}
            {state === 'ready' && featuredProjects.length > 0 && (
              <div className="space-y-3.5">
                {featuredProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} compact />
                ))}
              </div>
            )}

            {/* Empty State: Database has 0 published projects */}
            {state === 'empty' && (
              <div className="rounded-xl border-2 border-dashed border-[#111111] bg-[#F7F0D2]/40 p-6 text-center sm:p-8">
                <div className="mx-auto grid size-12 place-items-center rounded-xl border-2 border-[#111111] bg-[#F2BE4E] shadow-[2px_2px_0_#111111]">
                  <Target size={22} className="text-[#151515]" strokeWidth={2.5} />
                </div>
                <h3 className="mt-4 text-base font-black text-[#151515]">
                  No open projects just yet.
                </h3>
                <p className="mx-auto mt-1.5 max-w-xs text-xs font-medium leading-relaxed text-[#655F52] sm:text-sm">
                  New opportunities from local businesses will appear here as they are published.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                  <Link
                    href="/projects"
                    className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#111111] bg-white px-3.5 py-2 text-xs font-bold text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F2BE4E] transition"
                  >
                    <FolderOpen size={14} />
                    <span>Explore All Projects</span>
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#111111] bg-[#D83D63] px-3.5 py-2 text-xs font-bold text-white shadow-[2px_2px_0_#111111] hover:bg-[#C02C51] transition"
                  >
                    <Briefcase size={14} />
                    <span>Post a Problem</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Database Unavailable State: Safe error handling without mock data */}
            {state === 'db_unavailable' && (
              <div className="rounded-xl border-2 border-[#111111] bg-[#FCE8ED] p-6 text-center sm:p-7">
                <div className="mx-auto grid size-11 place-items-center rounded-xl border-2 border-[#111111] bg-white shadow-[2px_2px_0_#111111]">
                  <AlertCircle size={22} className="text-[#D83D63]" strokeWidth={2.5} />
                </div>
                <h3 className="mt-3 text-sm font-black text-[#151515] sm:text-base">
                  Live project listings temporarily unavailable
                </h3>
                <p className="mx-auto mt-1 max-w-xs text-xs font-medium text-[#655F52]">
                  We are having trouble connecting to the live projects registry. Please check back shortly.
                </p>
                <div className="mt-4 flex justify-center">
                  <Link
                    href="/projects"
                    className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#111111] bg-white px-4 py-2 text-xs font-bold text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F7F0D2]"
                  >
                    <span>Browse Project Board</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
