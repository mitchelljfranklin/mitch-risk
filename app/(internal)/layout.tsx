import { UserRole } from "@prisma/client";

import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { UserMenu } from "@/components/user-menu";
import { requireUser } from "@/lib/auth";
import { getNotificationCounts } from "@/lib/db/notifications";
import { getAppearanceSettings, getOrganizationSettings } from "@/lib/settings";

export default async function InternalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const [organization, notificationCounts, appearance] = await Promise.all([
    getOrganizationSettings(),
    getNotificationCounts(user.id),
    getAppearanceSettings(),
  ]);

  return (
    <SidebarProvider>
      <AppSidebar
        orgName={organization.name}
        isAdmin={user.role === UserRole.ADMIN}
        notificationCount={notificationCounts.total}
        hasLogo={Boolean(appearance.logoKey)}
      />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1" />
          <ThemeToggle />
          <UserMenu
            name={user.name ?? user.email ?? "Account"}
            email={user.email ?? ""}
            role={user.role}
          />
        </header>
        <main
          id="main-content"
          className={`flex-1 p-6 ${appearance.pageWidth === "constrained" ? "mx-auto w-full max-w-6xl" : ""}`}
        >
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
