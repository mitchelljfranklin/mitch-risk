"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { Tabs } from "@/components/ui/tabs";

type UrlTabsProps = React.ComponentProps<typeof Tabs> & {
  defaultTab: string;
  allowedTabs: string[];
  paramName?: string;
};

export function UrlTabs({
  defaultTab,
  allowedTabs,
  paramName = "tab",
  ...props
}: UrlTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get(paramName);
  const currentTab =
    rawTab && allowedTabs.includes(rawTab) ? rawTab : defaultTab;

  const handleValueChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(paramName, value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, paramName],
  );

  return (
    <Tabs {...props} value={currentTab} onValueChange={handleValueChange} />
  );
}
