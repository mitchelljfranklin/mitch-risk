import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { UserMenu } from "@/components/user-menu";
import { PageMain } from "@/components/page-main";
import { ScrollToTop } from "@/components/scroll-to-top";
import { ToastProvider } from "@/components/toast";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { IdleTimer } from "@/components/idle-timer";
import { requireUser } from "@/lib/auth";
import { getNotificationCounts } from "@/lib/db/notifications";
import {
  getAppearanceSettings,
  getAssessmentSettings,
  getOrganizationSettings,
} from "@/lib/settings";

export default async function InternalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const [organization, notificationCounts, appearance, assessment] =
    await Promise.all([
      getOrganizationSettings(),
      getNotificationCounts(user.id),
      getAppearanceSettings(),
      getAssessmentSettings(),
    ]);

  return (
    <ToastProvider>
      <IdleTimer timeoutMinutes={assessment.sessionTimeoutMinutes} />
      <KeyboardShortcuts permissions={user.permissions} />
      <SidebarProvider>
        <AppSidebar
          orgName={organization.name}
          permissions={user.permissions}
          notificationCount={notificationCounts.total}
          hasLogo={Boolean(appearance.logoKey)}
        />
        <SidebarInset>
          <header className="bg-background sticky top-0 z-10 flex h-14 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex-1" />
            <ThemeToggle />
            <UserMenu
              name={user.name ?? user.email ?? "Account"}
              email={user.email ?? ""}
              role={user.roleName}
            />
          </header>
          <PageMain pageWidth={appearance.pageWidth}>{children}</PageMain>
          <ScrollToTop />
        </SidebarInset>
      </SidebarProvider>
    </ToastProvider>
  );
}
