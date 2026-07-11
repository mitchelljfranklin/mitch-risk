import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageSkeleton.Title width="w-40" />
      <PageSkeleton.Subtitle width="w-56" />
      <PageSkeleton.StatCards count={3} />
      <PageSkeleton.Filters widths={["w-40", "w-40"]} />
      <PageSkeleton.Table />
    </PageSkeleton>
  );
}
