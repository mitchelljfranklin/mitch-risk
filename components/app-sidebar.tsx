"use client";

import {
  Building2,
  ClipboardCheck,
  ClipboardList,
  ClipboardPenLine,
  LayoutDashboard,
  Library,
  Settings,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
];

export function AppSidebar({
  orgName,
  permissions,
  hasLogo,
  logoKey,
}: AppSidebarProps) {
  const pathname = usePathname();

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
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === "/settings" ||
                      pathname.startsWith("/settings/")
                    }
                  >
                    <Link href="/settings">
                      <Settings />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
    </Sidebar>
  );
}
