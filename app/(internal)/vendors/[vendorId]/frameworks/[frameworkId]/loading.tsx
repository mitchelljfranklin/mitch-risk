import { Skeleton } from "@/components/ui/skeleton";

export default function HeatmapLoading() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-6 w-full rounded" />
          <Skeleton className="h-6 w-full rounded" />
          <Skeleton className="h-6 w-full rounded" />
          <Skeleton className="h-6 w-full rounded" />
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
}
