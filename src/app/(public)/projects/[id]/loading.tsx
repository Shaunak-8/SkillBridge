import { Skeleton } from "@/components/shared/Skeleton";

export default function Loading() {
  return (
    <main role="status" aria-label="Loading project" className="mx-auto max-w-5xl px-5 py-10">
      <Skeleton className="mb-8 h-5 w-40" />
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div><Skeleton className="h-6 w-48" /><Skeleton className="mt-5 h-10 w-3/4" /><Skeleton className="mt-4 h-4 w-full" /><Skeleton className="mt-10 h-24 w-full" /><Skeleton className="mt-8 h-8 w-2/3" /></div>
        <Skeleton className="h-56 w-full" />
      </div>
    </main>
  );
}
