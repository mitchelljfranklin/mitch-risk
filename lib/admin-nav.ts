import { type Permission, PERMISSIONS, hasPermission } from "@/lib/permissions";

// The admin area's sections and groups, in display order. This is the single
// source of truth for the admin sidebar, the header gear icon's landing
// target, and the /admin index redirect — all three must agree on which
// sections exist and who can see them.
//
// Sections carry the same permission keys the old settings tabs enforced.
// A section the user cannot access is hidden, never greyed out.

export type AdminSection = {
  label: string;
  href: string;
  permission: Permission;
};

export type AdminSectionGroup = {
  label: string;
  sections: AdminSection[];
};

export const ADMIN_SECTION_GROUPS: readonly AdminSectionGroup[] = [
  {
    label: "Workspace",
    sections: [
      {
        label: "General",
        href: "/admin/general",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
      {
        label: "Appearance",
        href: "/admin/appearance",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
    ],
  },
  {
    label: "Email",
    sections: [
      {
        label: "Email",
        href: "/admin/email",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
      {
        label: "Email tracking",
        href: "/admin/email-tracking",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
    ],
  },
  {
    label: "Assessments",
    sections: [
      {
        label: "Scoring",
        href: "/admin/scoring",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
      {
        label: "Scheduling",
        href: "/admin/scheduling",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
    ],
  },
  {
    label: "Files",
    sections: [
      {
        label: "Storage",
        href: "/admin/storage",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
    ],
  },
  {
    label: "Access & security",
    sections: [
      {
        label: "Users",
        href: "/admin/users",
        permission: PERMISSIONS.USERS_MANAGE,
      },
      {
        label: "Roles",
        href: "/admin/roles",
        permission: PERMISSIONS.ROLES_MANAGE,
      },
      {
        label: "Sign-in",
        href: "/admin/sign-in",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
      {
        label: "Rate limits",
        href: "/admin/rate-limits",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
    ],
  },
  {
    label: "Integrations",
    sections: [
      {
        label: "API",
        href: "/admin/api",
        permission: PERMISSIONS.API_MANAGE,
      },
      {
        label: "Webhooks",
        href: "/admin/webhooks",
        permission: PERMISSIONS.WEBHOOKS_MANAGE,
      },
    ],
  },
  {
    label: "Platform",
    sections: [
      {
        label: "Trust Center",
        href: "/admin/trust-center",
        permission: PERMISSIONS.TRUSTCENTER_MANAGE,
      },
      {
        label: "Audit log",
        href: "/admin/audit",
        permission: PERMISSIONS.AUDIT_VIEW,
      },
      {
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
