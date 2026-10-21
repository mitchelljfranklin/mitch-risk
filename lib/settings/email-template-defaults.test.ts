import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/config";
import { emailTemplateSchema } from "./schema";
import {
  getEmailTemplateDefaults,
  localizeEmailTemplates,
} from "./email-template-defaults";

const TOKEN_PATTERN = /\{\{(\w+)\}\}/g;

function tokens(value: string): string[] {
  return [
    ...new Set([...value.matchAll(TOKEN_PATTERN)].map((m) => m[1])),
  ].sort();
}

describe("localized email template defaults", () => {
  it("defines the same fields for every locale", () => {
    const english = getEmailTemplateDefaults("en");
    for (const locale of LOCALES) {
      const localized = getEmailTemplateDefaults(locale);
      expect(Object.keys(localized).sort(), locale).toEqual(
        Object.keys(english).sort(),
      );
    }
  });

  it("keeps every English token placeholder in every locale", () => {
    const english = getEmailTemplateDefaults("en");
    for (const locale of LOCALES) {
      const localized = getEmailTemplateDefaults(locale);
      for (const key of Object.keys(english) as (keyof typeof english)[]) {
        expect(tokens(localized[key]), `${locale}.${key}`).toEqual(
          tokens(english[key]),
        );
      }
    }
  });

  it("localizes unmodified templates but preserves customized ones", () => {
    const stored = {
      ...emailTemplateSchema.parse({}),
      inviteSubject: "Custom subject",
    };
    const localized = localizeEmailTemplates(stored, "es");
    expect(localized.inviteSubject).toBe("Custom subject");
    expect(localized.reminderSubject).toBe(
      "Recordatorio: {{assessmentTitle}} vence el {{dueDate}}",
    );
  });

  it("returns the stored templates unchanged for English", () => {
    const stored = emailTemplateSchema.parse({});
    expect(localizeEmailTemplates(stored, "en")).toEqual(stored);
  });
});
