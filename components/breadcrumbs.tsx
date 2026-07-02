import Link from "next/link";

type BreadcrumbSegment = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ segments }: { segments: BreadcrumbSegment[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        Dashboard
      </Link>
      {segments.map((segment) => (
        <span key={segment.label} className="flex items-center gap-1.5">
          <span className="text-muted-foreground">/</span>
          {segment.href ? (
            <Link
              href={segment.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {segment.label}
            </Link>
          ) : (
            <span className="text-foreground">{segment.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
