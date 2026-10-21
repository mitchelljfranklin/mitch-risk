import { type AbstractIntlMessages } from "next-intl";

import { type Locale } from "./config";

const MESSAGE_LOADERS: Record<
  Locale,
  () => Promise<{ default: AbstractIntlMessages }>
> = {
  en: () => import("../../messages/en.json"),
  es: () => import("../../messages/es.json"),
  fr: () => import("../../messages/fr.json"),
  de: () => import("../../messages/de.json"),
  pt: () => import("../../messages/pt.json"),
  it: () => import("../../messages/it.json"),
  nl: () => import("../../messages/nl.json"),
  ja: () => import("../../messages/ja.json"),
  ko: () => import("../../messages/ko.json"),
  zh: () => import("../../messages/zh.json"),
  ar: () => import("../../messages/ar.json"),
  hi: () => import("../../messages/hi.json"),
};

export async function loadMessages(
  locale: Locale,
): Promise<AbstractIntlMessages> {
  return (await MESSAGE_LOADERS[locale]()).default;
}

export type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;
