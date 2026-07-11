import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageSkeleton.Title />
      <PageSkeleton.Subtitle />
      <PageSkeleton.Table />
    </PageSkeleton>
  );
}
