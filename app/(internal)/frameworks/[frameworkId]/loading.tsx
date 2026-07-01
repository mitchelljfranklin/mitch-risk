import { Skeleton } from "@/components/ui/skeleton";

export default function FrameworkDetailLoading() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </div>
  );
}
