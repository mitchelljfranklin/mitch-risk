export type PdfTranslate = {
  (key: string, values?: Record<string, string | number>): string;
  has: (key: string) => boolean;
};

export type PdfDateFormatOptions = {
  year?: "numeric" | "2-digit";
  month?: "long" | "short" | "narrow" | "numeric" | "2-digit";
  day?: "numeric" | "2-digit";
  timeZone?: string;
};

export type PdfFormatter = {
  dateTime: (value: Date | number, options?: PdfDateFormatOptions) => string;
};

export function translateOrRaw(
  translations: PdfTranslate,
  key: string,
  fallback: string,
): string {
  return translations.has(key) ? translations(key) : fallback;
}
