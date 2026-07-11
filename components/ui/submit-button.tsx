"use client";

import { type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  disabled,
  ...props
}: ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} disabled={disabled || pending}>
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
      {children}
    </Button>
  );
}
