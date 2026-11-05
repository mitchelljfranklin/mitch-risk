import { defaultLocale, isLocale, type Locale } from "./config";

type LocaleResolutionInput = {
  cookieLocale?: string | null;
  organizationDefault?: string | null;
  acceptLanguage?: string | null;
};

export function resolveLocale({
  cookieLocale,
  organizationDefault,
  acceptLanguage,
}: LocaleResolutionInput): Locale {
  if (isLocale(cookieLocale)) return cookieLocale;
  if (isLocale(organizationDefault)) return organizationDefault;
  return localeFromAcceptLanguage(acceptLanguage) ?? defaultLocale;
}

export function localeFromAcceptLanguage(
  header: string | null | undefined,
): Locale | undefined {
  if (!header) return undefined;

  const candidates = header
    .split(",")
    .map((entry) => {
      const [rawTag, ...parameters] = entry.trim().split(";");
      const qualityParameter = parameters.find((parameter) =>
        parameter.trim().startsWith("q="),
      );
      const quality = qualityParameter
        ? Number(qualityParameter.trim().slice(2))
        : 1;
      return {
        tag: rawTag?.trim().toLowerCase() ?? "",
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter((candidate) => candidate.tag.length > 0 && candidate.quality > 0)
    .sort((first, second) => second.quality - first.quality);

  for (const candidate of candidates) {
    const baseLanguage = candidate.tag.split("-")[0];
    if (isLocale(baseLanguage)) return baseLanguage;
  }

  return undefined;
}
