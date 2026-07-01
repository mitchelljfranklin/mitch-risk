"use client";

import {
  Building2,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  Library,
  Settings,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
};

type AppSidebarProps = {
  orgName: string;
  isAdmin: boolean;
  notificationCount: number;
  hasLogo: boolean;
};

export function AppSidebar({
  orgName,
  isAdmin,
  notificationCount,
  hasLogo,
}: AppSidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "Vendors", href: "/vendors", icon: Building2 },
    { title: "Assessments", href: "/assessments", icon: ClipboardCheck },
    { title: "Frameworks", href: "/frameworks", icon: Library },
    { title: "Templates", href: "/templates", icon: ClipboardList },
    ...(isAdmin
      ? [{ title: "Settings", href: "/settings", icon: Settings }]
      : []),
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          {hasLogo ? (
            <img
              src="/api/brand/logo"
              alt={orgName}
              className="h-8 w-auto max-w-[120px] rounded object-contain"
            />
          ) : (
            <ShieldCheck className="size-5" />
          )}
          <span className="truncate font-semibold">{orgName}</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
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
      </SidebarContent>
      {notificationCount > 0 ? (
        <SidebarFooter>
          <div className="flex items-center gap-2 px-4 py-3">
            <div className="bg-primary text-primary-foreground flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold">
              {notificationCount}
            </div>
            <span className="text-muted-foreground text-sm">
              {notificationCount === 1
                ? "item needs attention"
                : "items need attention"}
            </span>
          </div>
        </SidebarFooter>
      ) : null}
    </Sidebar>
  );
}
