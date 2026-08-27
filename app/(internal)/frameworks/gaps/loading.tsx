import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageSkeleton.Title width="w-56" />
      <PageSkeleton.Filters widths={["w-40", "w-40", "w-44"]} />
      <PageSkeleton.Content />
    </PageSkeleton>
  );
}
