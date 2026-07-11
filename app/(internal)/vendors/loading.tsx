import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageSkeleton.Title width="w-40" />
      <PageSkeleton.Filters />
      <PageSkeleton.Cards count={6} />
    </PageSkeleton>
  );
}
