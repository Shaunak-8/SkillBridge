import { CardGridSkeleton, Skeleton } from "@/components/shared/Skeleton";

export default function Loading() {
  return (
    <main role="status" aria-label="Loading projects" className="mx-auto max-w-7xl px-5 py-12">
      <Skeleton className="h-4 w-28" /><Skeleton className="mt-4 h-10 w-96 max-w-full" /><Skeleton className="mt-4 h-4 w-2/3" />
      <Skeleton className="mb-6 mt-8 h-20 w-full" />
      <CardGridSkeleton />
    </main>
  );
}
