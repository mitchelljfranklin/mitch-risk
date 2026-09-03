import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageSkeleton.Title width="w-40" />
      <PageSkeleton.Content />
      <PageSkeleton.Content />
      <PageSkeleton.Content />
    </PageSkeleton>
  );
}
