"use client";

import { Button } from "@/components/ui/button";

export default function FrameworkErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="text-muted-foreground text-sm">
        An unexpected error occurred. Please try again or contact support.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
