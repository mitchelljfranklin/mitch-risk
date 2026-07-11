import { Skeleton } from "@/components/ui/skeleton";

function PageSkeletonWrapper({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-6">{children}</div>;
}

function Title({ width = "w-48" }: { width?: string }) {
  return <Skeleton className={`${width} h-8`} />;
}

function Subtitle({ width = "w-56" }: { width?: string }) {
  return <Skeleton className={`${width} h-4`} />;
}

function Filters({ widths = ["w-48", "w-32"] }: { widths?: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {widths.map((width, index) => (
        <Skeleton key={index} className={`${width} h-9`} />
      ))}
    </div>
  );
}

function Tabs({ count = 2 }: { count?: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-9 w-24" />
      ))}
    </div>
  );
}

function Cards({
  count = 4,
  height = "h-32",
}: {
  count?: number;
  height?: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className={`${height} w-full rounded-lg`} />
      ))}
    </div>
  );
}

function StatCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  );
}

function Table({ height = "h-64" }: { height?: string }) {
  return <Skeleton className={`${height} w-full rounded-lg`} />;
}

function Form({
  rows = 3,
  maxWidth = "max-w-xl",
}: {
  rows?: number;
  maxWidth?: string;
}) {
  return (
    <div className={`flex ${maxWidth} flex-col gap-6`}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton
          key={index}
          className={`${index === rows - 1 ? "h-10 w-32" : "h-10 w-full"} rounded-md`}
        />
      ))}
    </div>
  );
}

function FormCard({ inputRows = 3 }: { inputRows?: number }) {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-64 w-full rounded-lg" />
      {Array.from({ length: inputRows }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full rounded-md" />
      ))}
    </div>
  );
}

function Content({ height = "h-48" }: { height?: string }) {
  return <Skeleton className={`${height} w-full rounded-lg`} />;
}

export const PageSkeleton = Object.assign(PageSkeletonWrapper, {
  Title,
  Subtitle,
  Filters,
  Tabs,
  Cards,
  StatCards,
  Table,
  Form,
  FormCard,
  Content,
});
