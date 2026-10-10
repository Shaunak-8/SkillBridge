'use client';

import Link from "next/link";
import { ArrowUpRight, Clock, MapPin, Users } from "lucide-react";
import type { Project } from "@/types";
import { Badge } from "@/components/ui";
import { useLanguage } from "@/lib/i18n/context";

export function ProjectStatusBadge({ status }: { status: Project["status"] }) {
  const { t } = useLanguage();
  const labels: Record<string, string> = {
    published: t('open') !== 'open' ? t('open') : 'Open',
    in_progress: t('in_progress') !== 'in_progress' ? t('in_progress') : 'In progress',
    completed: t('completed') !== 'completed' ? t('completed') : 'Completed',
    draft: t('draft') !== 'draft' ? t('draft') : 'Draft',
    closed: t('closed') !== 'closed' ? t('closed') : 'Closed',
    cancelled: 'Cancelled',
  };
  const tone =
    status === "published"
      ? "green"
      : status === "in_progress"
      ? "gold"
      : status === "draft"
      ? "pink"
      : "default";

  return <Badge tone={tone}>{labels[status] || status}</Badge>;
}

export function SkillBadge({ name }: { name: string; type?: string }) {
  return (
    <span className="inline-flex items-center rounded-md border-[1.5px] border-[#111111] bg-[#F7F0D2] px-2 py-0.5 text-[11px] font-bold text-[#151515] shadow-[1.5px_1.5px_0_#111111]">
      {name}
    </span>
  );
}

export function ProjectCard({
  project,
  compact = false,
}: {
  project: Project;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const targetHref =
    project.status === "draft"
      ? `/business/projects/${project.id}/verify`
      : `/projects/${project.id}`;

  const displayCategory = t(project.category) !== project.category ? t(project.category) : project.category;
  const displayLocation = project.location
    ? (t(project.location) !== project.location ? t(project.location) : project.location)
    : t('remote_friendly');

  return (
    <div
      className={`group flex h-full flex-col justify-between rounded-xl border-2 border-[#111111] bg-white shadow-[4px_4px_0_#111111] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#111111] ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div>
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-md border-[1.5px] border-[#111111] bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#151515] shadow-[1.5px_1.5px_0_#111111]">
            {displayCategory}
          </span>
          <ProjectStatusBadge status={project.status} />
        </div>

        {project.businessName && (
          <p className="text-xs font-bold uppercase tracking-wide text-[#D83D63]">
            {t(project.businessName) !== project.businessName ? t(project.businessName) : project.businessName}
          </p>
        )}

        <h3
          className={`mt-1 font-black leading-snug text-[#151515] transition-colors group-hover:text-[#D83D63] ${
            compact ? "text-sm sm:text-base line-clamp-1" : "text-base sm:text-lg"
          }`}
        >
          {project.title}
        </h3>

        <p
          className={`mt-1.5 font-medium leading-relaxed text-[#655F52] ${
            compact ? "line-clamp-2 text-xs" : "line-clamp-2 text-xs sm:text-sm"
          }`}
        >
          {project.summary || project.description}
        </p>

        {project.requirements && project.requirements.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.requirements.slice(0, compact ? 2 : 3).map((r) => (
              <SkillBadge key={r.id} name={r.skill.name} />
            ))}
            {compact && project.requirements.length > 2 && (
              <span className="inline-flex items-center rounded-md border-[1.5px] border-[#111111] bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#655F52]">
                +{project.requirements.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      <div className={`border-t-2 border-[#111111] ${compact ? "mt-3.5 pt-2.5" : "mt-5 pt-3.5"}`}>
        <div className="flex items-center justify-between text-xs font-semibold text-[#655F52]">
          <span className="flex items-center gap-1 truncate max-w-[120px]">
            <MapPin size={13} className="shrink-0 text-[#151515]" />
            <span className="truncate">{displayLocation}</span>
          </span>
          {project.duration && (
            <span className="flex items-center gap-1">
              <Clock size={13} className="shrink-0 text-[#151515]" />
              <span>{t(project.duration) !== project.duration ? t(project.duration) : project.duration}</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users size={13} className="shrink-0 text-[#151515]" />
            <span>{project.mode === "team" ? t('team') : t('solo')}</span>
          </span>
        </div>

        <Link
          href={targetHref}
          className="mt-3 flex items-center justify-between rounded-lg border-2 border-[#111111] bg-[#F7F0D2] px-3 py-2 text-xs font-bold text-[#151515] shadow-[2px_2px_0_#111111] transition-all hover:bg-[#D83D63] hover:text-white active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#111111]"
        >
          <span>{project.status === "draft" ? t('draft') : t('view_project_apply')}</span>
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </div>
  );
}
