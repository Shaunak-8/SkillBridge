'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, ExternalLink, FileEdit, Sparkles, Trash2, Users } from 'lucide-react';
import { Badge, Card, Button } from '@/components/ui';
import type { BusinessProject } from '@/lib/business/contracts';
import { DeleteProjectModal } from './DeleteProjectModal';

export const actionClass =
  'btn-press inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-[#111111] bg-[#D83D63] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0_#111111] hover:bg-[#c22e53] transition';

export function ProjectList({ projects: initialProjects }: { projects: BusinessProject[] }) {
  const router = useRouter();
  const [projectsList, setProjectsList] = useState<BusinessProject[]>(initialProjects);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; title?: string | null } | null>(null);

  const handleDeleted = (deletedId: string) => {
    setProjectsList((prev) => prev.filter((p) => p.id !== deletedId));
    router.refresh();
  };

  if (!projectsList.length) {
    return (
      <Card className="p-8 text-center bg-white border-2 border-[#111111] shadow-[4px_4px_0_#111111]">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border-2 border-[#111111] bg-[#F2BE4E] shadow-[3px_3px_0_#111111]">
          <Sparkles size={24} className="text-[#151515]" />
        </div>
        <h2 className="text-xl font-black text-[#151515]">No projects yet</h2>
        <p className="mx-auto mb-6 mt-2 max-w-lg text-sm leading-relaxed text-[#655F52]">
          Describe a problem your business faces in everyday language, and SkillBridge will turn it into a structured brief that students can tackle.
        </p>
        <Link className={actionClass} href="/business/projects/new">
          Post Your First Problem
        </Link>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        {projectsList.map((project) => {
          const isDraft = project.status === 'draft';
          const formattedDate = new Intl.DateTimeFormat('en-IN', {
            dateStyle: 'medium',
            timeZone: 'Asia/Kolkata',
          }).format(new Date(project.updated_at));

          return (
            <div
              key={project.id}
              className="flex flex-col justify-between rounded-2xl border-2 border-[#111111] bg-white p-5 shadow-[4px_4px_0_#111111] transition-transform hover:-translate-y-0.5"
            >
              <div>
                {/* Header tags */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone={isDraft ? 'amber' : 'green'}>
                      {isDraft ? 'Draft Brief' : 'Published'}
                    </Badge>
                    {project.category && (
                      <span className="rounded-md border border-[#111111] bg-[#F7F0D2] px-2 py-0.5 text-[10px] font-bold text-[#151515]">
                        {project.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#655F52]">
                      <Clock size={12} /> {formattedDate}
                    </span>
                    <button
                      type="button"
                      onClick={() => setProjectToDelete({ id: project.id, title: project.title })}
                      className="inline-flex items-center rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Delete project"
                      aria-label="Delete project"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Title & summary */}
                <h3 className="break-words text-base font-black text-[#151515]">
                  {project.title || 'Untitled draft brief'}
                </h3>
                <p className="mb-4 mt-2 line-clamp-3 break-words text-xs leading-relaxed text-[#655F52]">
                  {project.summary || project.problem_statement || 'No description provided.'}
                </p>

                {/* Skills tags */}
                {project.required_skills && project.required_skills.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {project.required_skills.slice(0, 4).map((sk) => (
                      <span
                        key={sk}
                        className="rounded border border-[#111111] bg-[#F7F0D2] px-2 py-0.5 text-[10px] font-semibold text-[#151515]"
                      >
                        {sk}
                      </span>
                    ))}
                    {project.required_skills.length > 4 && (
                      <span className="text-[10px] font-bold text-[#655F52] self-center">
                        +{project.required_skills.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Footer with meta & actions */}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t-2 border-[#111111]/10 pt-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#151515]">
                  <Users size={14} className="text-[#D83D63]" />
                  {project.application_count ?? 0}{' '}
                  {project.application_count === 1 ? 'applicant' : 'applicants'}
                </span>

                <div className="flex flex-wrap gap-2">
                  <Link
                    className="btn-press inline-flex items-center gap-1 rounded-lg border-2 border-[#111111] bg-white px-3 py-1.5 text-xs font-bold text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F7F0D2]"
                    href={`/business/projects/${project.id}`}
                  >
                    View Details <ExternalLink size={12} />
                  </Link>
                  {isDraft && (
                    <Link
                      className="btn-press inline-flex items-center gap-1 rounded-lg border-2 border-[#111111] bg-[#F2BE4E] px-3 py-1.5 text-xs font-bold text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#e0ad3d]"
                      href={`/business/projects/${project.id}/edit`}
                    >
                      <FileEdit size={12} />
                      {project.owner_confirmed ? 'Publish' : 'Edit Brief'}
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => setProjectToDelete({ id: project.id, title: project.title })}
                    className="btn-press inline-flex items-center gap-1 rounded-lg border-2 border-[#111111] bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700 shadow-[2px_2px_0_#111111] hover:bg-rose-200"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <DeleteProjectModal
        project={projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onDeleted={handleDeleted}
      />
    </>
  );
}
