"use client";

import { useState, type ComponentProps } from "react";

import { cn } from "@/lib/utils";

type PendingLinkProps = ComponentProps<"a"> & {
  /** Label shown while the target is generating. */
  pendingLabel?: string;
};

export function PendingLink({
  pendingLabel = "Preparing…",
  className,
  onClick,
  children,
  ...rest
}: PendingLinkProps) {
  const [pending, setPending] = useState(false);

  return (
    <a
      {...rest}
      className={cn(className, pending && "pointer-events-none opacity-70")}
      onClick={(event) => {
        setPending(true);
        onClick?.(event);
        // Report generation is server-side and unmeasured; reset after a
        // generous window so a failed generation doesn't stay disabled.
        window.setTimeout(() => setPending(false), 15_000);
      }}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {pendingLabel}
        </span>
      ) : (
        children
      )}
    </a>
  );
}
