export const PERMISSIONS = {
  VENDORS_VIEW: "vendors:view",
  VENDORS_CREATE: "vendors:create",
  VENDORS_EDIT: "vendors:edit",
  VENDORS_DELETE: "vendors:delete",
  ASSESSMENTS_VIEW: "assessments:view",
  ASSESSMENTS_CREATE: "assessments:create",
  ASSESSMENTS_EDIT: "assessments:edit",
  ASSESSMENTS_REVIEW: "assessments:review",
  ASSESSMENTS_DELETE: "assessments:delete",
  TEMPLATES_VIEW: "templates:view",
  TEMPLATES_CREATE: "templates:create",
  TEMPLATES_EDIT: "templates:edit",
  TEMPLATES_DELETE: "templates:delete",
  FRAMEWORKS_VIEW: "frameworks:view",
  FRAMEWORKS_EDIT: "frameworks:edit",
  FRAMEWORKS_DELETE: "frameworks:delete",
  AUDIT_VIEW: "audit:view",
  USERS_MANAGE: "users:manage",
  ROLES_MANAGE: "roles:manage",
  SETTINGS_MANAGE: "settings:manage",
  API_MANAGE: "api:manage",
  WEBHOOKS_MANAGE: "webhooks:manage",
  PROFILE_VIEW: "profile:view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: readonly Permission[] =
  Object.values(PERMISSIONS);

type PermissionGroup = {
  resource: string;
  label: string;
  permissions: { key: Permission; label: string }[];
};

export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  {
    resource: "vendors",
    label: "Vendors",
    permissions: [
      { key: PERMISSIONS.VENDORS_VIEW, label: "View vendors" },
      { key: PERMISSIONS.VENDORS_CREATE, label: "Create vendors" },
      { key: PERMISSIONS.VENDORS_EDIT, label: "Edit vendors" },
      { key: PERMISSIONS.VENDORS_DELETE, label: "Delete vendors" },
    ],
  },
  {
    resource: "assessments",
    label: "Assessments",
    permissions: [
      { key: PERMISSIONS.ASSESSMENTS_VIEW, label: "View assessments" },
      {
        key: PERMISSIONS.ASSESSMENTS_CREATE,
        label: "Create & send assessments",
      },
      { key: PERMISSIONS.ASSESSMENTS_EDIT, label: "Edit & manage links" },
      { key: PERMISSIONS.ASSESSMENTS_REVIEW, label: "Review & finalize" },
      { key: PERMISSIONS.ASSESSMENTS_DELETE, label: "Delete assessments" },
    ],
  },
  {
    resource: "templates",
    label: "Templates",
    permissions: [
      { key: PERMISSIONS.TEMPLATES_VIEW, label: "View templates" },
      { key: PERMISSIONS.TEMPLATES_CREATE, label: "Create templates" },
      { key: PERMISSIONS.TEMPLATES_EDIT, label: "Edit & publish templates" },
      { key: PERMISSIONS.TEMPLATES_DELETE, label: "Delete templates" },
    ],
  },
  {
    resource: "frameworks",
    label: "Frameworks",
    permissions: [
      { key: PERMISSIONS.FRAMEWORKS_VIEW, label: "View frameworks" },
      { key: PERMISSIONS.FRAMEWORKS_EDIT, label: "Edit frameworks" },
      { key: PERMISSIONS.FRAMEWORKS_DELETE, label: "Delete frameworks" },
    ],
  },
  {
    resource: "administration",
    label: "Administration",
    permissions: [
      { key: PERMISSIONS.AUDIT_VIEW, label: "View audit & email logs" },
      { key: PERMISSIONS.USERS_MANAGE, label: "Manage users" },
      { key: PERMISSIONS.ROLES_MANAGE, label: "Manage roles" },
      { key: PERMISSIONS.SETTINGS_MANAGE, label: "Manage settings" },
      { key: PERMISSIONS.API_MANAGE, label: "Manage API access" },
    ],
  },
  {
    resource: "webhooks",
    label: "Webhooks",
    permissions: [
      { key: PERMISSIONS.WEBHOOKS_MANAGE, label: "Manage webhooks" },
    ],
  },
  {
    resource: "profile",
    label: "Profile",
    permissions: [
      { key: PERMISSIONS.PROFILE_VIEW, label: "View and edit own profile" },
    ],
  },
];

export const SYSTEM_ROLE_NAMES = {
  ADMIN: "Admin",
  REVIEWER: "Reviewer",
  VIEWER: "Viewer",
} as const;

const REVIEWER_PERMISSIONS: readonly Permission[] = [
  PERMISSIONS.VENDORS_VIEW,
  PERMISSIONS.VENDORS_CREATE,
  PERMISSIONS.VENDORS_EDIT,
  PERMISSIONS.VENDORS_DELETE,
  PERMISSIONS.ASSESSMENTS_VIEW,
  PERMISSIONS.ASSESSMENTS_CREATE,
  PERMISSIONS.ASSESSMENTS_EDIT,
  PERMISSIONS.ASSESSMENTS_REVIEW,
  PERMISSIONS.ASSESSMENTS_DELETE,
  PERMISSIONS.TEMPLATES_VIEW,
  PERMISSIONS.TEMPLATES_CREATE,
  PERMISSIONS.TEMPLATES_EDIT,
  PERMISSIONS.TEMPLATES_DELETE,
  PERMISSIONS.FRAMEWORKS_VIEW,
  PERMISSIONS.FRAMEWORKS_EDIT,
  PERMISSIONS.FRAMEWORKS_DELETE,
  PERMISSIONS.PROFILE_VIEW,
];

const VIEWER_PERMISSIONS: readonly Permission[] = [
  PERMISSIONS.VENDORS_VIEW,
  PERMISSIONS.ASSESSMENTS_VIEW,
  PERMISSIONS.TEMPLATES_VIEW,
  PERMISSIONS.FRAMEWORKS_VIEW,
  PERMISSIONS.PROFILE_VIEW,
];

export type SystemRoleDefinition = {
  name: string;
  description: string;
  permissions: readonly Permission[];
};

export const SYSTEM_ROLE_DEFINITIONS: readonly SystemRoleDefinition[] = [
  {
    name: SYSTEM_ROLE_NAMES.ADMIN,
    description:
      "Full access to every feature, including users, roles, and settings.",
    permissions: ALL_PERMISSIONS,
  },
  {
    name: SYSTEM_ROLE_NAMES.REVIEWER,
    description:
      "Can manage vendors, assessments, and templates and review responses. No access to users, roles, or settings.",
    permissions: REVIEWER_PERMISSIONS,
  },
  {
    name: SYSTEM_ROLE_NAMES.VIEWER,
    description: "Read-only access across the platform.",
    permissions: VIEWER_PERMISSIONS,
  },
];

export function isValidPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as readonly string[]).includes(value);
}

export function hasPermission(
  userPermissions: readonly string[],
  permission: Permission,
): boolean {
  return userPermissions.includes(permission);
}

export function hasAnyPermission(
  userPermissions: readonly string[],
  permissions: readonly Permission[],
): boolean {
  return permissions.some((permission) => userPermissions.includes(permission));
}

export function hasAllPermissions(
  userPermissions: readonly string[],
  permissions: readonly Permission[],
): boolean {
  return permissions.every((permission) =>
    userPermissions.includes(permission),
  );
}

export function countValidPermissions(
  userPermissions: readonly string[],
): number {
  return userPermissions.filter(isValidPermission).length;
}

export type PermissionCoverage = "none" | "partial" | "full";

export type RolePermissionGroupSummary = {
  resource: string;
  label: string;
  granted: number;
  total: number;
  coverage: PermissionCoverage;
};

export function summarizeRolePermissions(
  userPermissions: readonly string[],
): RolePermissionGroupSummary[] {
  return PERMISSION_GROUPS.map((group) => {
    const total = group.permissions.length;
    const granted = group.permissions.filter((permission) =>
      userPermissions.includes(permission.key),
    ).length;
    const coverage: PermissionCoverage =
      granted === 0 ? "none" : granted === total ? "full" : "partial";
    return {
      resource: group.resource,
      label: group.label,
      granted,
      total,
      coverage,
    };
  });
}
