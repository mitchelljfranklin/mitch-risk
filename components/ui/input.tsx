import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input selection:bg-primary selection:text-primary-foreground file:text-primary-foreground placeholder:text-muted-foreground dark:bg-input/30 h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        type === "file"
          ? "file:bg-primary file:hover:bg-primary/90 cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:px-3 file:py-1 file:text-sm file:font-medium"
          : "",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
