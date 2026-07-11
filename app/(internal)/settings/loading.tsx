import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageSkeleton.Title width="w-48" />
      <PageSkeleton.Tabs />
      <PageSkeleton.Content />
      <PageSkeleton.Content />
    </PageSkeleton>
  );
}
