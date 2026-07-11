import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageSkeleton.Title width="w-32" />
      <PageSkeleton.Subtitle width="w-48" />
      <PageSkeleton.Filters widths={["w-48", "w-32"]} />
      <PageSkeleton.Cards count={4} />
    </PageSkeleton>
  );
}
