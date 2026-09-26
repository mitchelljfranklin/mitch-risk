import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageSkeleton.Title width="w-48" />
      <PageSkeleton.Content />
      <PageSkeleton.Content />
    </PageSkeleton>
  );
}
