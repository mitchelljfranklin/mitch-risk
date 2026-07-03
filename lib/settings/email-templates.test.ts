import { describe, expect, it } from "vitest";

import {
  EMAIL_TEMPLATE_DEFINITIONS,
  getEmailTemplateDefaults,
  getEmailTemplateDefinition,
} from "@/lib/settings/email-templates";

describe("email template definitions", () => {
  it("covers all template types with unique keys", () => {
    expect(EMAIL_TEMPLATE_DEFINITIONS).toHaveLength(8);
    const types = EMAIL_TEMPLATE_DEFINITIONS.map(
      (definition) => definition.type,
    );
    expect(new Set(types).size).toBe(types.length);
  });

  it("maps every definition to real schema fields with defaults", () => {
    const defaults = getEmailTemplateDefaults();
    for (const definition of EMAIL_TEMPLATE_DEFINITIONS) {
      expect(typeof defaults[definition.subjectField]).toBe("string");
      expect(defaults[definition.subjectField].length).toBeGreaterThan(0);
      expect(typeof defaults[definition.bodyField]).toBe("string");
      expect(defaults[definition.bodyField].length).toBeGreaterThan(0);
    }
  });

  it("resolves a known template type and rejects an unknown one", () => {
    expect(getEmailTemplateDefinition("invite")?.subjectField).toBe(
      "inviteSubject",
    );
    expect(getEmailTemplateDefinition("does-not-exist")).toBeUndefined();
  });
});
