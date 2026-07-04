import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-40" />
      <div className="grid max-w-2xl gap-4">
        {[...Array(6)].map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}
