import { describe, expect, it } from "vitest";

import {
  ADMIN_SECTION_GROUPS,
  ALL_ADMIN_SECTIONS,
  ADMIN_AREA_PERMISSIONS,
  canAccessAdminArea,
  firstAccessibleAdminHref,
  findAdminSectionByHref,
  listAccessibleAdminSections,
} from "@/lib/admin-nav";
import { ALL_PERMISSIONS, PERMISSIONS } from "@/lib/permissions";

describe("admin nav definition", () => {
  it("exposes every former settings tab as a section", () => {
    const hrefs = ALL_ADMIN_SECTIONS.map((section) => section.href);
    expect(hrefs).toEqual([
      "/admin/general",
      "/admin/appearance",
      "/admin/email",
      "/admin/email-tracking",
      "/admin/scoring",
      "/admin/scheduling",
      "/admin/storage",
      "/admin/users",
      "/admin/roles",
      "/admin/sign-in",
      "/admin/rate-limits",
      "/admin/api",
      "/admin/webhooks",
      "/admin/trust-center",
      "/admin/audit",
      "/admin/health",
    ]);
  });

  it("resolves every section by its own href", () => {
    for (const section of ALL_ADMIN_SECTIONS) {
      expect(findAdminSectionByHref(section.href)?.label).toBe(section.label);
    }
  });

  it("shows a full admin every section", () => {
    const accessible = listAccessibleAdminSections([...ALL_PERMISSIONS]);
    expect(accessible).toHaveLength(ALL_ADMIN_SECTIONS.length);
    expect(firstAccessibleAdminHref([...ALL_PERMISSIONS])).toBe(
      "/admin/general",
    );
  });

  it("shows an audit-only role only the audit section", () => {
    const accessible = listAccessibleAdminSections([PERMISSIONS.AUDIT_VIEW]);
    expect(accessible.map((section) => section.href)).toEqual(["/admin/audit"]);
    expect(firstAccessibleAdminHref([PERMISSIONS.AUDIT_VIEW])).toBe(
      "/admin/audit",
    );
  });

  it("shows a users-manager only the users section", () => {
    const accessible = listAccessibleAdminSections([PERMISSIONS.USERS_MANAGE]);
    expect(accessible.map((section) => section.href)).toEqual(["/admin/users"]);
  });

  it("denies the whole area with no admin permissions", () => {
    expect(
      listAccessibleAdminSections([PERMISSIONS.VENDORS_VIEW]),
    ).toHaveLength(0);
    expect(firstAccessibleAdminHref([])).toBeNull();
    expect(canAccessAdminArea([PERMISSIONS.VENDORS_VIEW])).toBe(false);
  });

  it("derives the area gate from the sections themselves", () => {
    const expected = [
      ...new Set(ALL_ADMIN_SECTIONS.map((section) => section.permission)),
    ];
    expect(ADMIN_AREA_PERMISSIONS).toEqual(expected);
    expect(canAccessAdminArea([expected[0]])).toBe(true);
  });

  it("keeps group labels unique", () => {
    const labels = ADMIN_SECTION_GROUPS.map((group) => group.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
