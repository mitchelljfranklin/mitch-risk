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
import { ScrollLockFix } from "@/components/scroll-lock-fix";
import { Toaster } from "@/components/ui/sonner";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { IdleTimer } from "@/components/idle-timer";
import { requireUser } from "@/lib/auth";
import {
  getAppearanceSettings,
  getAssessmentSettings,
  getOrganizationSettings,
} from "@/lib/settings";

export default async function InternalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const [organization, appearance, assessment] = await Promise.all([
    getOrganizationSettings(),
    getAppearanceSettings(),
    getAssessmentSettings(),
  ]);

  return (
    <>
      <ScrollLockFix />
      <IdleTimer timeoutMinutes={assessment.sessionTimeoutMinutes} />
      <KeyboardShortcuts permissions={user.permissions} />
      <SidebarProvider>
        <AppSidebar
          orgName={organization.name}
          permissions={user.permissions}
          hasLogo={Boolean(appearance.logoKey)}
          logoKey={appearance.logoKey ?? ""}
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
      <Toaster />
    </>
  );
}
