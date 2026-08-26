import { describe, expect, it } from "vitest";

import {
  buildShortDomainLabels,
  initialismForDomain,
  preferredShortDomainLabel,
} from "@/lib/radar-labels";

describe("preferredShortDomainLabel", () => {
  it("extracts a parenthesised tag", () => {
    expect(preferredShortDomainLabel("Govern (GV)")).toBe("GV");
  });

  it("extracts a leading dotted code", () => {
    expect(preferredShortDomainLabel("A.5 Organizational")).toBe("A.5");
    expect(preferredShortDomainLabel("CC1 Control Environment")).toBe("CC1");
    expect(preferredShortDomainLabel("PI1.3 Processing")).toBe("PI1.3");
  });

  it("returns null for free-text domains, including capitalised words", () => {
    expect(preferredShortDomainLabel("Access Control Policy")).toBeNull();
    expect(preferredShortDomainLabel("Application Control")).toBeNull();
  });
});

describe("initialismForDomain", () => {
  it("builds an initialism from multi-word domains", () => {
    expect(initialismForDomain("Access Control Policy")).toBe("ACP");
  });

  it("slices single-word domains", () => {
    expect(initialismForDomain("Encryption")).toBe("ENCR");
  });

  it("ignores punctuation-only words", () => {
    expect(initialismForDomain("Physical & Environmental")).toBe("PE");
  });
});

describe("buildShortDomainLabels", () => {
  it("uses embedded codes when present", () => {
    const labels = buildShortDomainLabels([
      "Govern (GV)",
      "A.5 Organizational",
    ]);
    expect(labels.map((label) => label.shortLabel)).toEqual(["GV", "A.5"]);
  });

  it("de-duplicates colliding initialisms with suffixes", () => {
    const labels = buildShortDomainLabels([
      "Access Control",
      "Application Control",
      "Availability Control",
    ]);
    expect(labels.map((label) => label.shortLabel)).toEqual([
      "AC",
      "AC-2",
      "AC-3",
    ]);
  });

  it("keeps every label unique even for identical free-text domains", () => {
    const labels = buildShortDomainLabels(["Policy", "Policy"]);
    const values = labels.map((label) => label.shortLabel);
    expect(new Set(values).size).toBe(values.length);
  });

  it("always pairs each label back to its own domain", () => {
    const domains = [
      "Access Control",
      "Application Control",
      "Encryption",
      "Govern (GV)",
    ];
    const labels = buildShortDomainLabels(domains);
    expect(labels.map((label) => label.domain)).toEqual(domains);
  });
});
