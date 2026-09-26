import { describe, expect, it } from "vitest";

import {
  SETTINGS_TAB_REDIRECTS,
  resolveSettingsTabHref,
} from "@/lib/admin-redirect";
import { ALL_ADMIN_SECTIONS } from "@/lib/admin-nav";

describe("settings tab redirect map", () => {
  it("maps every old tab slug to an existing admin section", () => {
    const adminHrefs = new Set(
      ALL_ADMIN_SECTIONS.map((section) => section.href),
    );
    for (const [tab, href] of Object.entries(SETTINGS_TAB_REDIRECTS)) {
      expect(adminHrefs.has(href), `tab "${tab}" targets missing ${href}`).toBe(
        true,
      );
    }
  });

  it("covers all 16 former tab slugs", () => {
    expect(Object.keys(SETTINGS_TAB_REDIRECTS).sort()).toEqual(
      [
        "api",
        "appearance",
        "audit",
        "email",
        "email-tracking",
        "general",
        "health",
        "limits",
        "roles",
        "scheduling",
        "scoring",
        "sso",
        "storage",
        "trust-center",
        "users",
        "webhooks",
      ].sort(),
    );
  });

  it("maps the grab-bag tabs to their closest new homes", () => {
    expect(resolveSettingsTabHref("limits")).toBe("/admin/rate-limits");
    expect(resolveSettingsTabHref("sso")).toBe("/admin/sign-in");
  });

  it("returns null for unknown or missing tabs", () => {
    expect(resolveSettingsTabHref(undefined)).toBeNull();
    expect(resolveSettingsTabHref("nonexistent")).toBeNull();
    expect(resolveSettingsTabHref("")).toBeNull();
  });
});
