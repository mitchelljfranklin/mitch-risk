"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error(
      "Global error boundary caught:",
      error.message,
      error.digest ? `(digest: ${error.digest})` : "",
    );
  }, [error]);

  return (
    <html>
      <body className="min-h-svh antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-muted-foreground text-sm">
            A critical error occurred. Please try again or contact support.
          </p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </body>
    </html>
  );
}
