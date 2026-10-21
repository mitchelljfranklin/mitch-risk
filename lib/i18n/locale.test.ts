import { describe, expect, it } from "vitest";

import { localeDirection } from "./config";
import { localeFromAcceptLanguage, resolveLocale } from "./locale";

describe("resolveLocale", () => {
  it("prefers the cookie over the organization default and the browser header", () => {
    expect(
      resolveLocale({
        cookieLocale: "en",
        organizationDefault: "es",
        acceptLanguage: "es-ES,es;q=0.9",
      }),
    ).toBe("en");
  });

  it("uses the organization default over the browser header", () => {
    expect(
      resolveLocale({
        cookieLocale: null,
        organizationDefault: "es",
        acceptLanguage: "en-GB,en;q=0.9",
      }),
    ).toBe("es");
  });

  it("ignores an unsupported cookie and organization default, then uses the header", () => {
    expect(
      resolveLocale({
        cookieLocale: "pl",
        organizationDefault: "sv",
        acceptLanguage: "es-MX,es;q=0.9",
      }),
    ).toBe("es");
  });

  it("falls back to the default locale when nothing matches", () => {
    expect(
      resolveLocale({
        cookieLocale: null,
        organizationDefault: null,
        acceptLanguage: "pl-PL,pl;q=0.9",
      }),
    ).toBe("en");
  });
});

describe("localeFromAcceptLanguage", () => {
  it("marks Arabic as right-to-left and other locales as left-to-right", () => {
    expect(localeDirection("ar")).toBe("rtl");
    expect(localeDirection("ja")).toBe("ltr");
    expect(localeDirection("en")).toBe("ltr");
  });

  it("orders candidates by quality value", () => {
    expect(localeFromAcceptLanguage("en;q=0.4, es;q=0.9, fr;q=0.2")).toBe("es");
  });

  it("treats a regional tag as its base language", () => {
    expect(localeFromAcceptLanguage("es-AR")).toBe("es");
  });

  it("skips unsupported languages and zero-quality entries", () => {
    expect(localeFromAcceptLanguage("pl, es;q=0, en;q=0.5")).toBe("en");
  });

  it("matches the newly supported base languages and regional variants", () => {
    expect(localeFromAcceptLanguage("ja-JP")).toBe("ja");
    expect(localeFromAcceptLanguage("ko-KR")).toBe("ko");
    expect(localeFromAcceptLanguage("zh-CN")).toBe("zh");
    expect(localeFromAcceptLanguage("pt-BR")).toBe("pt");
    expect(localeFromAcceptLanguage("ar-EG")).toBe("ar");
    expect(localeFromAcceptLanguage("hi-IN")).toBe("hi");
  });

  it("returns undefined without a usable header", () => {
    expect(localeFromAcceptLanguage(null)).toBeUndefined();
    expect(localeFromAcceptLanguage("")).toBeUndefined();
    expect(localeFromAcceptLanguage("pl-PL,pl;q=0.9")).toBeUndefined();
  });
});
