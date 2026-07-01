import { Skeleton } from "@/components/ui/skeleton";

export default function AssessmentDetailLoading() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-72" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}
