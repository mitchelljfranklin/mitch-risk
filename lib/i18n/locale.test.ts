import { describe, expect, it } from "vitest";

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
        cookieLocale: "de",
        organizationDefault: "fr",
        acceptLanguage: "es-MX,es;q=0.9",
      }),
    ).toBe("es");
  });

  it("falls back to the default locale when nothing matches", () => {
    expect(
      resolveLocale({
        cookieLocale: null,
        organizationDefault: null,
        acceptLanguage: "fr-FR,fr;q=0.9",
      }),
    ).toBe("en");
  });
});

describe("localeFromAcceptLanguage", () => {
  it("orders candidates by quality value", () => {
    expect(localeFromAcceptLanguage("en;q=0.4, es;q=0.9, fr;q=0.2")).toBe("es");
  });

  it("treats a regional tag as its base language", () => {
    expect(localeFromAcceptLanguage("es-AR")).toBe("es");
  });

  it("skips unsupported languages and zero-quality entries", () => {
    expect(localeFromAcceptLanguage("de, es;q=0, en;q=0.5")).toBe("en");
  });

  it("returns undefined without a usable header", () => {
    expect(localeFromAcceptLanguage(null)).toBeUndefined();
    expect(localeFromAcceptLanguage("")).toBeUndefined();
    expect(localeFromAcceptLanguage("de-DE,de;q=0.9")).toBeUndefined();
  });
});
