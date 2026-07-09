import { Skeleton } from "@/components/ui/skeleton";

export default function NewAssessmentLoading() {
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-32 w-full rounded-md" />
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-10 w-32 rounded-md" />
    </div>
  );
}
