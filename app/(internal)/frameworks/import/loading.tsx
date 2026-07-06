import { Skeleton } from "@/components/ui/skeleton";

export default function ImportFrameworkLoading() {
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-48" />
      <div className="flex flex-col gap-4 rounded-lg border p-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
    </div>
  );
}
