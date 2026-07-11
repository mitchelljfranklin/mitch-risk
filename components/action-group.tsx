"use client";

import { type ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

type ActionGroupProps = {
  children: ReactNode;
};

export function ActionGroup({ children }: ActionGroupProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className={
        isMobile
          ? "flex gap-2 overflow-x-auto pb-1"
          : "flex flex-wrap items-center gap-2"
      }
    >
      {children}
    </div>
  );
}
