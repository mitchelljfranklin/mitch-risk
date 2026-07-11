// Reusable form field wrapper with proper aria-describedby wiring.
// Available for adoption as forms need accessibility improvements.
// Usage: <FormField label="Email" htmlFor="email" error={state?.errors?.email} helpText="Your work email address.">
//   <Input id="email" name="email" />
// </FormField>

"use client";

import { type ReactNode, useId } from "react";

import { Label } from "@/components/ui/label";

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  error?: string;
  helpText?: string;
  children: ReactNode;
};

export function FormField({
  label,
  htmlFor,
  error,
  helpText,
  children,
}: FormFieldProps) {
  const errorId = useId();
  const helpId = useId();
  const describedBy = [error ? errorId : null, helpText ? helpId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {helpText ? (
        <p id={helpId} className="text-muted-foreground text-xs">
          {helpText}
        </p>
      ) : null}
      <div aria-describedby={describedBy || undefined}>{children}</div>
      {error ? (
        <p id={errorId} className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
