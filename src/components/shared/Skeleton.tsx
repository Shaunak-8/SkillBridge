/** Placeholder blocks shown by loading.tsx while a server page fetches its data. */
export const Skeleton = ({ className = "" }: { className?: string }) => <div aria-hidden className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />;

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-line bg-white p-5">
          <Skeleton className="h-5 w-24" /><Skeleton className="mt-4 h-6 w-3/4" /><Skeleton className="mt-3 h-4 w-full" />
          <div className="mt-4 flex gap-2"><Skeleton className="h-6 w-20" /><Skeleton className="h-6 w-24" /></div>
        </div>
      ))}
    </div>
  );
}

/** Sidebar + content placeholder for the signed-in student and business workspaces. */
export function WorkspaceSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex min-h-screen bg-canvas">
      <div className="hidden w-64 shrink-0 space-y-3 border-r border-line bg-white p-5 md:block">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
      <div className="min-w-0 flex-1 p-5 sm:p-8"><Skeleton className="h-8 w-64" /><Skeleton className="mt-3 h-4 w-96 max-w-full" /><div className="mt-8"><CardGridSkeleton count={4} /></div></div>
    </div>
  );
}
