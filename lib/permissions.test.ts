import { describe, expect, it } from "vitest";

import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  PERMISSION_GROUPS,
  SYSTEM_ROLE_DEFINITIONS,
  SYSTEM_ROLE_NAMES,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isValidPermission,
} from "@/lib/permissions";

describe("permission catalog", () => {
  it("has unique permission keys", () => {
    const unique = new Set(ALL_PERMISSIONS);
    expect(unique.size).toBe(ALL_PERMISSIONS.length);
  });

  it("lists every catalog permission in exactly one group", () => {
    const grouped = PERMISSION_GROUPS.flatMap((group) =>
      group.permissions.map((permission) => permission.key),
    );
    expect(new Set(grouped).size).toBe(grouped.length);
    expect([...grouped].sort()).toEqual([...ALL_PERMISSIONS].sort());
  });

  it("validates known and unknown permission keys", () => {
    expect(isValidPermission(PERMISSIONS.VENDORS_VIEW)).toBe(true);
    expect(isValidPermission("vendors:teleport")).toBe(false);
  });
});

describe("system role defaults", () => {
  function rolePermissions(name: string): readonly string[] {
    const role = SYSTEM_ROLE_DEFINITIONS.find(
      (definition) => definition.name === name,
    );
    if (!role) throw new Error(`missing role ${name}`);
    return role.permissions;
  }

  it("grants Admin every permission", () => {
    expect([...rolePermissions(SYSTEM_ROLE_NAMES.ADMIN)].sort()).toEqual(
      [...ALL_PERMISSIONS].sort(),
    );
  });

  it("grants Viewer only view permissions", () => {
    const viewer = rolePermissions(SYSTEM_ROLE_NAMES.VIEWER);
    expect(viewer.length).toBeGreaterThan(0);
    for (const permission of viewer) {
      expect(permission.endsWith(":view")).toBe(true);
    }
    expect(viewer).not.toContain(PERMISSIONS.SETTINGS_MANAGE);
  });

  it("grants Reviewer write and review but not administration", () => {
    const reviewer = rolePermissions(SYSTEM_ROLE_NAMES.REVIEWER);
    expect(reviewer).toContain(PERMISSIONS.VENDORS_CREATE);
    expect(reviewer).toContain(PERMISSIONS.ASSESSMENTS_REVIEW);
    expect(reviewer).toContain(PERMISSIONS.TEMPLATES_EDIT);
    expect(reviewer).not.toContain(PERMISSIONS.USERS_MANAGE);
    expect(reviewer).not.toContain(PERMISSIONS.ROLES_MANAGE);
    expect(reviewer).not.toContain(PERMISSIONS.SETTINGS_MANAGE);
  });
});

describe("permission helpers", () => {
  const permissions = [PERMISSIONS.VENDORS_VIEW, PERMISSIONS.ASSESSMENTS_VIEW];

  it("hasPermission checks membership", () => {
    expect(hasPermission(permissions, PERMISSIONS.VENDORS_VIEW)).toBe(true);
    expect(hasPermission(permissions, PERMISSIONS.VENDORS_DELETE)).toBe(false);
  });

  it("hasAnyPermission requires at least one match", () => {
    expect(
      hasAnyPermission(permissions, [
        PERMISSIONS.VENDORS_DELETE,
        PERMISSIONS.ASSESSMENTS_VIEW,
      ]),
    ).toBe(true);
    expect(
      hasAnyPermission(permissions, [
        PERMISSIONS.VENDORS_DELETE,
        PERMISSIONS.USERS_MANAGE,
      ]),
    ).toBe(false);
  });

  it("hasAllPermissions requires every match", () => {
    expect(
      hasAllPermissions(permissions, [
        PERMISSIONS.VENDORS_VIEW,
        PERMISSIONS.ASSESSMENTS_VIEW,
      ]),
    ).toBe(true);
    expect(
      hasAllPermissions(permissions, [
        PERMISSIONS.VENDORS_VIEW,
        PERMISSIONS.VENDORS_DELETE,
      ]),
    ).toBe(false);
  });
});
