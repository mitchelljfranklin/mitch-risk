import { Skeleton } from "@/components/ui/skeleton";

export default function VendorCompareLoading() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
