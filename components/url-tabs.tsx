"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { cn } from "@/lib/utils";
import { Tabs } from "@/components/ui/tabs";
import { resolveTab } from "@/lib/nav";

type UrlTabsProps = React.ComponentProps<typeof Tabs> & {
  defaultTab: string;
  allowedTabs: string[];
  paramName?: string;
  /** Lets the tab list scroll horizontally instead of clipping on phones. */
  scrollable?: boolean;
};

export function UrlTabs({
  defaultTab,
  allowedTabs,
  paramName = "tab",
  scrollable = false,
  ...props
}: UrlTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTab = resolveTab(
    searchParams.get(paramName),
    allowedTabs,
    defaultTab,
  );

  const handleValueChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(paramName, value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, paramName],
  );

  return (
    <Tabs
      {...props}
      value={currentTab}
      onValueChange={handleValueChange}
      className={
        scrollable ? cn("max-w-full", props.className) : props.className
      }
    >
      {/*
        TabsList is inline-flex w-fit by default; wrapping it in a full-width
        overflow container keeps every trigger reachable on narrow screens.
      */}
      {scrollable ? (
        <div className="max-w-full overflow-x-auto pb-0.5">
          {props.children}
        </div>
      ) : (
        props.children
      )}
    </Tabs>
  );
}
