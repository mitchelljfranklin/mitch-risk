import { describe, expect, it } from "vitest";

import { emailTemplateSchema } from "./schema";
import {
  getEmailTemplateDefaults,
  localizeEmailTemplates,
} from "./email-template-defaults";

describe("localized email template defaults", () => {
  it("defines the same fields for every locale", () => {
    const english = getEmailTemplateDefaults("en");
    const spanish = getEmailTemplateDefaults("es");
    expect(Object.keys(spanish).sort()).toEqual(Object.keys(english).sort());
  });

  it("keeps the token placeholders in the Spanish defaults", () => {
    const spanish = getEmailTemplateDefaults("es");
    expect(spanish.inviteBody).toContain("{{assessmentTitle}}");
    expect(spanish.inviteBody).toContain("{{portalUrl}}");
    expect(spanish.reminderBody).toContain("{{dueDate}}");
    expect(spanish.resetBody).toContain("{{resetUrl}}");
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
