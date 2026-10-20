"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setLocaleAction } from "@/lib/actions/locale";
import { LOCALE_LABELS, LOCALES } from "@/lib/i18n/config";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Common");
  const router = useRouter();
  const [selectedLocale, setSelectedLocale] = useState(locale);
  const [isPending, startTransition] = useTransition();

  function changeLocale(nextLocale: string) {
    if (nextLocale === selectedLocale) return;
    setSelectedLocale(nextLocale);

    startTransition(async () => {
      await setLocaleAction(nextLocale);
      router.refresh();
    });
  }

  return (
    <Select
      value={selectedLocale}
      onValueChange={changeLocale}
      disabled={isPending}
    >
      <SelectTrigger aria-label={t("changeLanguage")} className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LOCALES.map((availableLocale) => (
          <SelectItem key={availableLocale} value={availableLocale}>
            {LOCALE_LABELS[availableLocale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
