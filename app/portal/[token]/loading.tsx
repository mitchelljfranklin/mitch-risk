// Public first impression: no auth or data required, just a quiet placeholder
// while the token lookup resolves.
export default function PortalLoading() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      <div className="bg-muted animate-pulse h-16 w-16 rounded-full" />
      <div className="flex w-full max-w-md flex-col gap-3">
        <div className="bg-muted h-7 w-2/3 animate-pulse rounded" />
        <div className="bg-muted h-4 w-full animate-pulse rounded" />
        <div className="bg-muted h-32 w-full animate-pulse rounded-md border" />
        <div className="flex items-center gap-3">
          <div className="bg-muted h-10 flex-1 animate-pulse rounded-md" />
          <div className="bg-muted h-10 w-24 animate-pulse rounded-md" />
        </div>
      </div>
      <p className="text-muted-foreground text-xs">Loading questionnaire…</p>
    </div>
  );
}
