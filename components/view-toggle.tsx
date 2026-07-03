"use client";

import { LayoutGrid, List } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { LIST_VIEW_COOKIE_MAX_AGE, type ListView } from "@/lib/view-preference";
import { cn } from "@/lib/utils";

type ViewToggleProps = {
  value: ListView;
  cookieName: string;
  ariaLabel: string;
};

export function ViewToggle({ value, cookieName, ariaLabel }: ViewToggleProps) {
  const router = useRouter();

  const setView = useCallback(
    (next: ListView) => {
      if (next === value) return;
      document.cookie = `${cookieName}=${next}; path=/; max-age=${LIST_VIEW_COOKIE_MAX_AGE}`;
      router.refresh();
    },
    [value, cookieName, router],
  );

  const options: { view: ListView; label: string; Icon: typeof List }[] = [
    { view: "rows", label: "Row view", Icon: List },
    { view: "cards", label: "Card view", Icon: LayoutGrid },
  ];

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex items-center rounded-md border p-0.5"
    >
      {options.map(({ view, label, Icon }) => (
        <Button
          key={view}
          type="button"
          size="sm"
          variant={value === view ? "secondary" : "ghost"}
          aria-pressed={value === view}
          title={label}
          onClick={() => setView(view)}
          className={cn("h-7 px-2", value !== view && "text-muted-foreground")}
        >
          <Icon className="size-4" />
          <span className="sr-only">{label}</span>
        </Button>
      ))}
    </div>
  );
}
