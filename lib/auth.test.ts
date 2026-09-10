import { describe, expect, it } from "vitest";

import {
  ALL_PERMISSIONS,
  hasPermission,
  isValidPermission,
  PERMISSIONS,
  PERMISSION_GROUPS,
  SYSTEM_ROLE_DEFINITIONS,
  SYSTEM_ROLE_NAMES,
} from "@/lib/permissions";

// This suite replaces an older file that duplicated session.test.ts and
// exercised nothing from lib/auth.ts at all. The gate logic shared by every
// page/action/route lives here, so its invariants belong under test.
describe("permission catalog integrity", () => {
  it("has a non-empty catalog with unique keys", () => {
    expect(ALL_PERMISSIONS.length).toBeGreaterThan(0);
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
  });

  it("includes every named key", () => {
    for (const permission of Object.values(PERMISSIONS)) {
      expect(ALL_PERMISSIONS).toContain(permission);
    }
  });

  it("exposes every key exactly once across the UI groups", () => {
    const groupKeys = PERMISSION_GROUPS.flatMap((group) =>
      group.permissions.map((entry) => entry.key),
    );
    expect(new Set(groupKeys).size).toBe(groupKeys.length);
    for (const key of ALL_PERMISSIONS) {
      expect(groupKeys).toContain(key);
    }
  });

  it("validates permission strings strictly", () => {
    expect(isValidPermission("vendors:view")).toBe(true);
    expect(isValidPermission("VENDORS_VIEW")).toBe(false);
    expect(isValidPermission("vendors:view2")).toBe(false);
    expect(isValidPermission("")).toBe(false);
  });
});

describe("system role defaults", () => {
  const definitions = Object.fromEntries(
    SYSTEM_ROLE_DEFINITIONS.map((role) => [role.name, role]),
  );

  it("ships exactly the three system roles", () => {
    expect(SYSTEM_ROLE_DEFINITIONS).toHaveLength(3);
    expect(Object.keys(definitions)).toEqual(
      expect.arrayContaining([
        SYSTEM_ROLE_NAMES.ADMIN,
        SYSTEM_ROLE_NAMES.REVIEWER,
        SYSTEM_ROLE_NAMES.VIEWER,
      ]),
    );
  });

  it("grants Admin everything", () => {
    const admin = definitions[SYSTEM_ROLE_NAMES.ADMIN]!;
    expect([...admin.permissions].sort()).toEqual([...ALL_PERMISSIONS].sort());
  });

  it("keeps management permissions out of Reviewer and Viewer", () => {
    const management = [
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.ROLES_MANAGE,
      PERMISSIONS.SETTINGS_MANAGE,
      PERMISSIONS.API_MANAGE,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.WEBHOOKS_MANAGE,
    ];
    for (const roleName of [
      SYSTEM_ROLE_NAMES.REVIEWER,
      SYSTEM_ROLE_NAMES.VIEWER,
    ]) {
      for (const permission of management) {
        expect(
          hasPermission(definitions[roleName]!.permissions, permission),
        ).toBe(false);
      }
    }
  });

  it("keeps Viewer strictly read-only", () => {
    const viewer = definitions[SYSTEM_ROLE_NAMES.VIEWER]!;
    for (const permission of viewer.permissions) {
      expect(permission.endsWith(":view")).toBe(true);
    }
  });

  it("gives Reviewer everything Viewer has plus review/write keys", () => {
    const reviewer = definitions[SYSTEM_ROLE_NAMES.REVIEWER]!;
    const viewer = definitions[SYSTEM_ROLE_NAMES.VIEWER]!;
    for (const permission of viewer.permissions) {
      expect(reviewer.permissions).toContain(permission);
    }
    expect(reviewer.permissions).toContain(PERMISSIONS.ASSESSMENTS_REVIEW);
  });
});

describe("hasPermission gate semantics", () => {
  it("matches exact keys only", () => {
    const permissions = [PERMISSIONS.VENDORS_VIEW];
    expect(hasPermission(permissions, PERMISSIONS.VENDORS_VIEW)).toBe(true);
    expect(hasPermission(permissions, PERMISSIONS.VENDORS_EDIT)).toBe(false);
    // A longer stored key must never satisfy a shorter request.
    expect(hasPermission(["vendors:viewX"], PERMISSIONS.VENDORS_VIEW)).toBe(
      false,
    );
  });

  it("denies when the user carries no permissions", () => {
    expect(hasPermission([], PERMISSIONS.VENDORS_EDIT)).toBe(false);
  });
});
