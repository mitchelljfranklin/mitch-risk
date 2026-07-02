"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { value: string; label: string };

type AutoSubmitSelectProps = {
  name: string;
  defaultValue: string;
  options: Option[];
  id?: string;
  className?: string;
  ariaLabel?: string;
};

/**
 * A Select that submits its enclosing <form> on change. Use inside a GET form
 * so changing sort/page-size re-runs the server query while preserving the
 * other form fields.
 */
export function AutoSubmitSelect({
  name,
  defaultValue,
  options,
  id,
  className,
  ariaLabel,
}: AutoSubmitSelectProps) {
  return (
    <>
      <input
        type="hidden"
        id={`${name}-proxy`}
        name={name}
        defaultValue={defaultValue}
      />
      <Select
        defaultValue={defaultValue}
        onValueChange={(value) => {
          const input = document.getElementById(
            `${name}-proxy`,
          ) as HTMLInputElement | null;
          if (input) {
            input.value = value;
            input.form?.requestSubmit();
          }
        }}
      >
        <SelectTrigger id={id} className={className} aria-label={ariaLabel}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
