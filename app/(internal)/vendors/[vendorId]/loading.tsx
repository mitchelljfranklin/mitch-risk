import { Skeleton } from "@/components/ui/skeleton";

export default function VendorDetailLoading() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
