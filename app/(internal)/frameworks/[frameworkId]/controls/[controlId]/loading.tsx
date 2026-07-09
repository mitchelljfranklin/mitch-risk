import { Skeleton } from "@/components/ui/skeleton";

export default function ControlDetailLoading() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-20 w-full rounded-lg" />
    </div>
  );
}
