"use client";

import {
  ArrowLeft,
  Braces,
  Building2,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  ClipboardPenLine,
  Gauge,
  HardDrive,
  HeartPulse,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Library,
  Mail,
  Palette,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShieldEllipsis,
  Target,
  Users,
  Webhook,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  type Permission,
  PERMISSIONS,
  hasAnyPermission,
  hasPermission,
} from "@/lib/permissions";
import {
  ADMIN_SECTION_GROUPS,
  type AdminSection,
  canAccessAdminSection,
} from "@/lib/admin-nav";

type AppSidebarProps = {
  orgName: string;
  permissions: string[];
  hasLogo: boolean;
  logoKey: string;
};

const MANAGE_PERMISSIONS: Permission[] = [
  PERMISSIONS.AUDIT_VIEW,
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.ROLES_MANAGE,
  PERMISSIONS.SETTINGS_MANAGE,
  PERMISSIONS.API_MANAGE,
  PERMISSIONS.TRUSTCENTER_MANAGE,
];

const SECTION_ICONS: Record<string, ComponentType> = {
  "/admin/general": Building2,
  "/admin/appearance": Palette,
  "/admin/email": Mail,
  "/admin/email-tracking": Inbox,
  "/admin/scoring": Target,
  "/admin/scheduling": CalendarClock,
  "/admin/storage": HardDrive,
  "/admin/users": Users,
  "/admin/roles": ShieldCheck,
  "/admin/sign-in": KeyRound,
  "/admin/rate-limits": Gauge,
  "/admin/api": Braces,
  "/admin/webhooks": Webhook,
  "/admin/trust-center": ShieldEllipsis,
  "/admin/audit": ScrollText,
  "/admin/health": HeartPulse,
};

export function AppSidebar({
  orgName,
  permissions,
  hasLogo,
  logoKey,
}: AppSidebarProps) {
  const pathname = usePathname();

  const inAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <Sidebar>
      <SidebarHeader className="from-primary/10 via-primary/5 bg-gradient-to-b to-transparent pb-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          {hasLogo ? (
            <img
              src={`/api/brand/logo?v=${logoKey}`}
              alt={orgName}
              width={120}
              height={32}
              loading="lazy"
              className="h-8 w-auto max-w-[120px] rounded object-contain"
            />
          ) : (
            <ShieldCheck className="size-5" />
          )}
          <span className="truncate font-semibold" title={orgName}>
            {orgName}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {inAdminArea ? (
          <AdminNav permissions={permissions} />
        ) : (
          <WorkspaceNav permissions={permissions} pathname={pathname} />
        )}
      </SidebarContent>
    </Sidebar>
  );
}

type NavProps = {
  permissions: string[];
  pathname: string;
};

function WorkspaceNav({ permissions, pathname }: NavProps) {
  const riskItems = [
    {
      title: "Vendors",
      href: "/vendors",
      icon: Building2,
      permission: PERMISSIONS.VENDORS_VIEW,
    },
    {
      title: "Assessments",
      href: "/assessments",
      icon: ClipboardCheck,
      permission: PERMISSIONS.ASSESSMENTS_VIEW,
    },
    {
      title: "Risk register",
      href: "/risk-register",
      icon: ShieldAlert,
      permission: PERMISSIONS.ASSESSMENTS_VIEW,
    },
    {
      title: "Self-assessment",
      href: "/self-assessment",
      icon: ClipboardPenLine,
      permission: PERMISSIONS.ASSESSMENTS_CREATE,
    },
  ].filter((item) => hasPermission(permissions, item.permission));

  const frameworkItems = [
    {
      title: "Frameworks",
      href: "/frameworks",
      icon: Library,
      permission: PERMISSIONS.FRAMEWORKS_VIEW,
    },
    {
      title: "Templates",
      href: "/templates",
      icon: ClipboardList,
      permission: PERMISSIONS.TEMPLATES_VIEW,
    },
  ].filter((item) => hasPermission(permissions, item.permission));

  const canManage = hasAnyPermission(permissions, MANAGE_PERMISSIONS);
  const canManageTrustCenter = hasPermission(
    permissions,
    PERMISSIONS.TRUSTCENTER_MANAGE,
  );

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={
                  pathname === "/dashboard" ||
                  pathname.startsWith("/dashboard/")
                }
              >
                <Link href="/dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {riskItems.length > 0 ? (
        <SidebarGroup>
          <SidebarGroupLabel>Risk</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {riskItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ) : null}

      {frameworkItems.length > 0 ? (
        <SidebarGroup>
          <SidebarGroupLabel>Frameworks</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {frameworkItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ) : null}

      {canManage ? (
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {canManageTrustCenter ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === "/trust-center" ||
                      pathname.startsWith("/trust-center/")
                    }
                  >
                    <Link href="/trust-center">
                      <ShieldEllipsis />
                      <span>Trust center</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === "/admin" || pathname.startsWith("/admin/")
                  }
                >
                  <Link href="/admin">
                    <Settings />
                    <span>Admin</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ) : null}
    </>
  );
}

function AdminNav({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();

  const groups = ADMIN_SECTION_GROUPS.map((group) => ({
    ...group,
    sections: group.sections.filter((section) =>
      canAccessAdminSection(permissions, section),
    ),
  })).filter((group) => group.sections.length > 0);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Back to workspace">
                <Link href="/dashboard">
                  <ArrowLeft />
                  <span>Back to workspace</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.sections.map((section: AdminSection) => {
                const Icon = SECTION_ICONS[section.href] ?? Settings;
                return (
                  <SidebarMenuItem key={section.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(section.href)}
                    >
                      <Link href={section.href}>
                        <Icon />
                        <span>{section.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
