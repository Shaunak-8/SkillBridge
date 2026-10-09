'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Badge, Card, Button } from '@/components/ui';
import type { BusinessProject } from '@/lib/business/contracts';
import { DeleteProjectModal } from './DeleteProjectModal';

export const actionClass = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark';

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
      <Card className="p-8 text-center">
        <h2 className="text-xl font-bold">No projects yet</h2>
        <p className="mx-auto mb-6 mt-3 max-w-lg text-sm leading-6 text-muted">
          Describe a problem your business faces, and we’ll help turn it into a project students can work on.
        </p>
        <Link className={actionClass} href="/business/projects/new">
          Post Your First Problem
        </Link>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {projectsList.map((project) => (
          <Card key={project.id} className="relative min-w-0 p-5 flex flex-col justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <Badge tone={project.status === 'draft' ? 'amber' : 'purple'}>
                  {project.status.replaceAll('_', ' ')}
                </Badge>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">
                    Updated {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date(project.updated_at))}
                  </span>
                  <button
                    type="button"
                    onClick={() => setProjectToDelete({ id: project.id, title: project.title })}
                    className="inline-flex items-center gap-1 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    title="Delete project"
                    aria-label="Delete project"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h2 className="break-words text-lg font-bold text-ink">
                {project.title || 'Untitled draft'}
              </h2>
              <p className="mb-4 mt-2 line-clamp-3 break-words text-sm leading-6 text-muted">
                {project.summary || project.problem_statement}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line/60 mt-2">
              <div className="flex flex-wrap gap-3">
                <Link className="inline-flex items-center font-semibold text-sm text-brand hover:underline" href={`/business/projects/${project.id}`}>
                  View project
                </Link>
                {project.status === 'draft' && (
                  <Link className="inline-flex items-center font-semibold text-sm text-brand hover:underline" href={`/business/projects/${project.id}/edit`}>
                    {project.owner_confirmed ? 'Review and publish' : 'Continue editing'}
                  </Link>
                )}
              </div>
              <Button
                variant="secondary"
                onClick={() => setProjectToDelete({ id: project.id, title: project.title })}
                className="gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 h-9"
              >
                <Trash2 size={13} />
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <DeleteProjectModal
        project={projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onDeleted={handleDeleted}
      />
    </>
  );
}
