"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useLocale } from "next-intl";

import { setLocaleAction } from "@/lib/actions/locale";

export function useLocaleSwitch() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale(nextLocale: string) {
    if (nextLocale === locale) return;
    startTransition(async () => {
      await setLocaleAction(nextLocale);
      router.refresh();
    });
  }

  return { locale, isPending, switchLocale };
}
