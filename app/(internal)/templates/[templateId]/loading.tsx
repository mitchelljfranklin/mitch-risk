import { Skeleton } from "@/components/ui/skeleton";

export default function TemplateDetailLoading() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}
