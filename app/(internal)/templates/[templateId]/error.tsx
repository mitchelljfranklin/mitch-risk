"use client";

import { Button } from "@/components/ui/button";

export default function TemplateDetailErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Failed to load template
      </h1>
      <p className="text-muted-foreground text-sm">
        An error occurred while loading this template. Please try again.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
