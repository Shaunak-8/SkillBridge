import { CardGridSkeleton, Skeleton } from "@/components/shared/Skeleton";

export default function Loading() {
  return <div role="status" aria-label="Loading students"><Skeleton className="h-9 w-56" /><Skeleton className="mt-3 h-4 w-full max-w-xl" /><Skeleton className="mt-6 mb-6 h-24 w-full" /><CardGridSkeleton count={6} /></div>;
}
