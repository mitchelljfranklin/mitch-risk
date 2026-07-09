import { Skeleton } from "@/components/ui/skeleton";

export default function EditQuestionLoading() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-24 w-full rounded-md" />
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-10 w-32 rounded-md" />
    </div>
  );
}
