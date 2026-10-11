'use client';

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { Project } from "@/types";
import { ProjectCard } from "@/components/shared/ProjectCard";
import { useLanguage } from "@/lib/i18n/context";

export function HomeProjectsSection({
  projects,
  hasHeroProjects,
}: {
  projects: Project[];
  hasHeroProjects: boolean;
}) {
  const { t } = useLanguage();

  // If there are no additional projects to display, omit or show compact directory link
  if (projects.length === 0) {
    return null;
  }

  return (
    <section className="border-t-2 border-[#111111] bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Section Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-md border-[1.5px] border-[#111111] bg-[#F7F0D2] px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-[#151515] shadow-[1.5px_1.5px_0_#111111]">
              <Sparkles size={13} className="text-[#D83D63]" />
              <span>Available Opportunities</span>
            </div>
            <h2 className="mt-2.5 text-2xl font-black tracking-tight text-[#151515] sm:text-3xl lg:text-4xl">
              Real challenges. Real opportunities.
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[#655F52] sm:text-base">
              Explore projects posted by local businesses and find opportunities to apply your skills.
            </p>
          </div>

          <Link
            href="/projects"
            className="inline-flex w-fit items-center gap-2 rounded-xl border-2 border-[#111111] bg-[#F2BE4E] px-4 py-2.5 text-xs sm:text-sm font-black text-[#151515] shadow-[3px_3px_0_#111111] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#111111] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#111111]"
          >
            <span>View All Projects</span>
            <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
        </div>

        {/* Projects Grid */}
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>

        {/* Bottom CTA to browse full catalog */}
        <div className="mt-12 text-center">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-[#111111] bg-[#F7F0D2] px-6 py-3 text-sm font-black text-[#151515] shadow-[3px_3px_0_#111111] transition hover:bg-[#F2BE4E] hover:shadow-[5px_5px_0_#111111]"
          >
            <span>Explore all projects in the registry</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
