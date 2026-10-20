"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocaleSwitch } from "@/hooks/use-locale-switch";
import { LOCALE_LABELS, LOCALES } from "@/lib/i18n/config";

export function LocaleSwitcher() {
  const translations = useTranslations("Common");
  const { locale, isPending, switchLocale } = useLocaleSwitch();
  const [selectedLocale, setSelectedLocale] = useState(locale);

  function changeLocale(nextLocale: string) {
    if (nextLocale === selectedLocale) return;
    setSelectedLocale(nextLocale);
    switchLocale(nextLocale);
  }

  return (
    <Select
      value={selectedLocale}
      onValueChange={changeLocale}
      disabled={isPending}
    >
      <SelectTrigger
        aria-label={translations("changeLanguage")}
        className="w-32"
      >
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
