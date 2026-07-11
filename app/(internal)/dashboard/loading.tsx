import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageSkeleton.Title />
      <PageSkeleton.StatCards count={4} />
      <PageSkeleton.Table />
    </PageSkeleton>
  );
}
