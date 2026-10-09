import Link from "next/link";
import { ArrowUpRight, MapPin, Users } from "lucide-react";
import type { Project } from "@/types";
import { Badge, Card } from "@/components/ui";

export function ProjectStatusBadge({ status }: { status: Project["status"] }) {
  const labels = { open: "Open", in_progress: "In progress", completed: "Completed", draft: "Draft" };
  return <Badge tone={status === "open" ? "green" : status === "in_progress" ? "purple" : "default"}>{labels[status]}</Badge>;
}
export function SkillBadge({ name, type = "technical" }: { name: string; type?: string }) { return <Badge tone={type === "technical" ? "blue" : type === "creative" ? "amber" : "purple"}>{name}</Badge>; }
export function ProjectCard({ project }: { project: Project }) {
  return <Card className="group flex h-full flex-col p-5">
    <div className="mb-4 flex items-start justify-between gap-3"><Badge tone="default">{project.category}</Badge><ProjectStatusBadge status={project.status} /></div>
    <h3 className="text-lg font-bold leading-snug group-hover:text-brand">{project.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{project.summary}</p>
    <div className="mt-4 flex flex-wrap gap-2">{project.requirements.slice(0, 3).map((r) => <SkillBadge key={r.id} name={r.skill.name} type={r.skill.type} />)}</div>
    <div className="mt-auto border-t border-line pt-4"><div className="flex items-center justify-between text-xs text-muted"><span className="flex items-center gap-1"><MapPin size={14} />{project.location}</span><span className="flex items-center gap-1"><Users size={14} />{project.mode === "team" ? "Team" : "Solo"}</span></div><Link href={`/projects/${project.id}`} className="mt-4 flex items-center justify-between text-sm font-semibold text-brand">View project <ArrowUpRight size={16} /></Link></div>
  </Card>;
}
