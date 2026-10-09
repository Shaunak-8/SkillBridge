import Link from "next/link";
import { ArrowUpRight, Clock, MapPin, Users } from "lucide-react";
import type { Project } from "@/types";
import { Badge } from "@/components/ui";

export function ProjectStatusBadge({ status }: { status: Project["status"] }) {
  const labels: Record<string, string> = {
    published: "Open",
    in_progress: "In progress",
    completed: "Completed",
    draft: "Draft",
    closed: "Closed",
    cancelled: "Cancelled",
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

export function ProjectCard({ project }: { project: Project }) {
  const targetHref =
    project.status === "draft"
      ? `/business/projects/${project.id}/verify`
      : `/projects/${project.id}`;

  return (
    <div className="group flex h-full flex-col justify-between rounded-xl border-2 border-[#111111] bg-white p-5 shadow-[4px_4px_0_#111111] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#111111]">
      <div>
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-md border-[1.5px] border-[#111111] bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#151515] shadow-[1.5px_1.5px_0_#111111]">
            {project.category}
          </span>
          <ProjectStatusBadge status={project.status} />
        </div>

        {project.businessName && (
          <p className="text-xs font-bold text-[#D83D63] uppercase tracking-wide">
            {project.businessName}
          </p>
        )}

        <h3 className="mt-1 text-base sm:text-lg font-black leading-snug text-[#151515] group-hover:text-[#D83D63] transition-colors">
          {project.title}
        </h3>

        <p className="mt-2 line-clamp-2 text-xs sm:text-sm font-medium leading-relaxed text-[#655F52]">
          {project.summary || project.description}
        </p>

        {project.requirements && project.requirements.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.requirements.slice(0, 3).map((r) => (
              <SkillBadge key={r.id} name={r.skill.name} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 border-t-2 border-[#111111] pt-3.5">
        <div className="flex items-center justify-between text-xs font-semibold text-[#655F52]">
          <span className="flex items-center gap-1">
            <MapPin size={13} className="text-[#151515]" />
            {project.location || "Remote"}
          </span>
          {project.duration && (
            <span className="flex items-center gap-1">
              <Clock size={13} className="text-[#151515]" />
              {project.duration}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users size={13} className="text-[#151515]" />
            {project.mode === "team" ? "Team" : "Solo"}
          </span>
        </div>

        <Link
          href={targetHref}
          className="mt-3.5 flex items-center justify-between rounded-lg border-2 border-[#111111] bg-[#F7F0D2] px-3 py-2 text-xs font-bold text-[#151515] shadow-[2px_2px_0_#111111] transition-all hover:bg-[#D83D63] hover:text-white active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#111111]"
        >
          <span>{project.status === "draft" ? "Review draft" : "View project & apply"}</span>
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </div>
  );
}
