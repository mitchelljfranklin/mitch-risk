"use client";

import { useTranslations } from "next-intl";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function DuplicateTemplateMenuItem() {
  const translations = useTranslations("Templates.builder.actions");

  return (
    <DropdownMenuItem
      onClick={() => {
        const form = document.getElementById(
          "duplicate-template-form",
        ) as HTMLFormElement | null;
        form?.requestSubmit();
      }}
    >
      {translations("duplicate")}
    </DropdownMenuItem>
  );
}
