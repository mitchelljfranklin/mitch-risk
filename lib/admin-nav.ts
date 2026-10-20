import { type Permission, PERMISSIONS, hasPermission } from "@/lib/permissions";

// The admin area's sections and groups, in display order. This is the single
// source of truth for the admin sidebar, the header gear icon's landing
// target, and the /admin index redirect — all three must agree on which
// sections exist and who can see them.
//
// Sections carry the same permission keys the old settings tabs enforced.
// A section the user cannot access is hidden, never greyed out.
//
// `key` is the translation key under Shell.admin; `label` remains the English
// fallback for non-sidebar surfaces.

export type AdminSection = {
  key: string;
  label: string;
  href: string;
  permission: Permission;
};

export type AdminSectionGroup = {
  key: string;
  label: string;
  sections: AdminSection[];
};

export const ADMIN_SECTION_GROUPS: readonly AdminSectionGroup[] = [
  {
    key: "workspace",
    label: "Workspace",
    sections: [
      {
        key: "general",
        label: "General",
        href: "/admin/general",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
      {
        key: "appearance",
        label: "Appearance",
        href: "/admin/appearance",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
    ],
  },
  {
    key: "email",
    label: "Email",
    sections: [
      {
        key: "email",
        label: "Email",
        href: "/admin/email",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
      {
        key: "emailTracking",
        label: "Email tracking",
        href: "/admin/email-tracking",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
    ],
  },
  {
    key: "assessments",
    label: "Assessments",
    sections: [
      {
        key: "scoring",
        label: "Scoring",
        href: "/admin/scoring",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
      {
        key: "scheduling",
        label: "Scheduling",
        href: "/admin/scheduling",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
    ],
  },
  {
    key: "files",
    label: "Files",
    sections: [
      {
        key: "storage",
        label: "Storage",
        href: "/admin/storage",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
    ],
  },
  {
    key: "accessSecurity",
    label: "Access & security",
    sections: [
      {
        key: "users",
        label: "Users",
        href: "/admin/users",
        permission: PERMISSIONS.USERS_MANAGE,
      },
      {
        key: "roles",
        label: "Roles",
        href: "/admin/roles",
        permission: PERMISSIONS.ROLES_MANAGE,
      },
      {
        key: "signIn",
        label: "Sign-in",
        href: "/admin/sign-in",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
      {
        key: "rateLimits",
        label: "Rate limits",
        href: "/admin/rate-limits",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
    ],
  },
  {
    key: "integrations",
    label: "Integrations",
    sections: [
      {
        key: "api",
        label: "API",
        href: "/admin/api",
        permission: PERMISSIONS.API_MANAGE,
      },
      {
        key: "webhooks",
        label: "Webhooks",
        href: "/admin/webhooks",
        permission: PERMISSIONS.WEBHOOKS_MANAGE,
      },
    ],
  },
  {
    key: "platform",
    label: "Platform",
    sections: [
      {
        key: "trustCenter",
        label: "Trust Center",
        href: "/admin/trust-center",
        permission: PERMISSIONS.TRUSTCENTER_MANAGE,
      },
      {
        key: "auditLog",
        label: "Audit log",
        href: "/admin/audit",
        permission: PERMISSIONS.AUDIT_VIEW,
      },
      {
        key: "health",
        label: "Health",
        href: "/admin/health",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
    ],
  },
];

export const ALL_ADMIN_SECTIONS: readonly AdminSection[] =
  ADMIN_SECTION_GROUPS.flatMap((group) => group.sections);

export function findAdminSectionByHref(href: string): AdminSection | undefined {
  return ALL_ADMIN_SECTIONS.find((section) => section.href === href);
}

export function canAccessAdminSection(
  permissions: readonly string[],
  section: AdminSection,
): boolean {
  return hasPermission(permissions, section.permission);
}

export function listAccessibleAdminSections(
  permissions: readonly string[],
): AdminSection[] {
  return ALL_ADMIN_SECTIONS.filter((section) =>
    canAccessAdminSection(permissions, section),
  );
}

export function firstAccessibleAdminHref(
  permissions: readonly string[],
): string | null {
  return listAccessibleAdminSections(permissions)[0]?.href ?? null;
}

// Permissions that grant any visibility of the admin area — gates the header
// gear icon and the /admin route guard.
export const ADMIN_AREA_PERMISSIONS: readonly Permission[] = [
  ...new Set(ALL_ADMIN_SECTIONS.map((section) => section.permission)),
];

export function canAccessAdminArea(permissions: readonly string[]): boolean {
  return ADMIN_AREA_PERMISSIONS.some((permission) =>
    hasPermission(permissions, permission),
  );
}
