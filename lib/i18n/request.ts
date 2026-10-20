import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { LOCALE_COOKIE, type Locale } from "./config";
import { resolveLocale } from "./locale";

const MESSAGE_LOADERS: Record<
  Locale,
  () => Promise<{ default: Record<string, unknown> }>
> = {
  en: () => import("../../messages/en.json"),
  es: () => import("../../messages/es.json"),
};

export default getRequestConfig(async () => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

  const locale = resolveLocale({
    cookieLocale: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });

  return {
    locale,
    messages: (await MESSAGE_LOADERS[locale]()).default,
  };
});
