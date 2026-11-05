"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export default function ProfileErrorPage({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const translations = useTranslations("Profile");
  const shellTranslations = useTranslations("Shell.error");

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {shellTranslations("title")}
      </h1>
      <p className="text-muted-foreground text-sm">
        {translations("errorDescription")}
      </p>
      <Button onClick={() => reset()}>{shellTranslations("retry")}</Button>
    </div>
  );
}
