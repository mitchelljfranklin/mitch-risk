"use client";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function DuplicateTemplateMenuItem() {
  return (
    <DropdownMenuItem
      onClick={() => {
        const form = document.getElementById(
          "duplicate-template-form",
        ) as HTMLFormElement | null;
        form?.requestSubmit();
      }}
    >
      Duplicate
    </DropdownMenuItem>
  );
}
