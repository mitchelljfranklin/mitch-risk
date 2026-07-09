import { Skeleton } from "@/components/ui/skeleton";

export default function TemplatePreviewLoading() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-64" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    </div>
  );
}
