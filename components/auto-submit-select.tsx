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
  defaultValue?: string;
  options: Option[];
  /**
   * When provided, an extra first item with an empty value is rendered so the
   * selection can be cleared back to "no filter" after picking a value.
   */
  emptyOptionLabel?: string;
  id?: string;
  className?: string;
  ariaLabel?: string;
};

/**
 * A Select that submits its enclosing <form> on change. Use inside a GET form
 * so changing sort/page-size/filters re-runs the server query while preserving
 * the other form fields.
 */
export function AutoSubmitSelect({
  name,
  defaultValue = "",
  options,
  emptyOptionLabel,
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
          {emptyOptionLabel ? (
            <SelectItem value="">{emptyOptionLabel}</SelectItem>
          ) : null}
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
