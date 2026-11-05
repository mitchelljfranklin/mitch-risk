export const LOCALES = [
  "en",
  "es",
  "fr",
  "de",
  "pt",
  "it",
  "nl",
  "ja",
  "ko",
  "zh",
  "ar",
  "hi",
] as const;

export type Locale = (typeof LOCALES)[number];

export const defaultLocale: Locale = "en";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  it: "Italiano",
  nl: "Nederlands",
  ja: "日本語",
  ko: "한국어",
  zh: "简体中文",
  ar: "العربية",
  hi: "हिन्दी",
};

const RTL_LOCALES: readonly Locale[] = ["ar"];

export function localeDirection(locale: string): "ltr" | "rtl" {
  const baseLocale = locale.split("-")[0] ?? locale;
  return RTL_LOCALES.some((rtlLocale) => rtlLocale === baseLocale)
    ? "rtl"
    : "ltr";
}

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (LOCALES as readonly string[]).includes(value)
  );
}
