import { type AbstractIntlMessages } from "next-intl";

import { type Locale } from "./config";

const MESSAGE_LOADERS: Record<
  Locale,
  () => Promise<{ default: AbstractIntlMessages }>
> = {
  en: () => import("../../messages/en.json"),
  es: () => import("../../messages/es.json"),
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
