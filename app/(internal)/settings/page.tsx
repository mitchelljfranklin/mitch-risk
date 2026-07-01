import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requireAdmin } from "@/lib/auth";
import { listAuditLogs, listAuditActions } from "@/lib/db/audit";
import { listUsersFull } from "@/lib/db/users";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { prisma } from "@/lib/prisma";
import {
  getEmailSettings,
  getEmailTemplateSettings,
  getOrganizationSettings,
  getScoringSettings,
  getSsoSettings,
  getAppearanceSettings,
  getAssessmentSettings,
  getFileSettings,
  getAuditRetention,
  getEmailLogRetention,
} from "@/lib/settings";
import { getSsoSecretConfigured } from "@/lib/settings";
import {
  changeRoleAction,
  resetPasswordAction,
  toggleUserAction,
} from "@/lib/actions/users";

import { AddUserForm } from "./add-user-form";

import { EmailForm } from "./email-form";
import { EmailTemplateForm } from "./email-template-form";
import { OrganizationForm } from "./organization-form";
import { ScoringForm } from "./scoring-form";
import { SsoForm } from "./sso-form";
import { AppearanceForm } from "./appearance-form";
import { ApiForm } from "./api-form";
import { AuditForm } from "./audit-form";
import { SchedulingForm } from "./scheduling-form";
import { LimitsForm } from "./limits-form";
import { EmailTrackingForm } from "./email-tracking";
import { listEmailLogs } from "@/lib/db/notifications";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings" };

type SettingsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const [
    organization,
    email,
    templates,
    scoring,
    fullUsers,
    sso,
    ssoSecrets,
    appearance,
    apiKeys,
    apiEnabled,
    actions,
    assessment,
    files,
    auditRetention,
    emailLogRetention,
  ] = await Promise.all([
    getOrganizationSettings(),
    getEmailSettings(),
    getEmailTemplateSettings(),
    getScoringSettings(),
    listUsersFull(),
    getSsoSettings(),
    getSsoSecretConfigured(),
    getAppearanceSettings(),
    prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        prefix: true,
        disabled: true,
        expiresAt: true,
        lastUsedAt: true,
        allowedIps: true,
        rateLimitPerMin: true,
        createdAt: true,
      },
    }),
    prisma.appSetting
      .findUnique({ where: { key: "api.enabled" } })
      .then((r) => r?.value === true),
    listAuditActions(),
    getAssessmentSettings(),
    getFileSettings(),
    getAuditRetention(),
    getEmailLogRetention(),
  ]);

  const users = fullUsers.map((u) => ({ id: u.id, name: u.name }));

  const auditLogs = await listAuditLogs({
    action: sp.action,
    userId: sp.userId,
    fromDate: sp.fromDate,
    toDate: sp.toDate,
    page: sp.auditPage ? parseInt(sp.auditPage) : 1,
  });

  const emailLogs = await listEmailLogs({
    status: sp.status,
    type: sp.type,
    recipient: sp.recipient,
    fromDate: sp.fromDate,
    toDate: sp.toDate,
    page: sp.emailLogPage ? parseInt(sp.emailLogPage) : 1,
  });

  const emailLogStatuses = ["SENT", "FAILED"];
  const emailLogTypes = ["INVITE", "REMINDER", "ESCALATION", "TEST"];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage operational configuration. Changes apply immediately — no file
          edits required.
        </p>
      </div>

      <Tabs defaultValue={sp.tab ?? "general"}>
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="email-tracking">Email Tracking</TabsTrigger>
          <TabsTrigger value="scoring">Scoring</TabsTrigger>
          <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
          <TabsTrigger value="limits">Limits</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="sso">SSO</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>Branding shown across the app.</CardDescription>
            </CardHeader>
            <CardContent>
              <OrganizationForm
                name={organization.name}
                supportEmail={organization.supportEmail}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-4 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customise the logo, primary colour (buttons), and secondary
                colour (tags/pills). Leave a field blank to use the default.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AppearanceForm
                primaryHex={appearance.primaryHex}
                secondaryHex={appearance.secondaryHex}
                hasLogo={Boolean(appearance.logoKey)}
                ragGreenHex={appearance.ragGreenHex}
                ragAmberHex={appearance.ragAmberHex}
                ragRedHex={appearance.ragRedHex}
                ragUnscoredHex={appearance.ragUnscoredHex}
                borderRadius={appearance.borderRadius}
                pageWidth={appearance.pageWidth}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="mt-4 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>API access</CardTitle>
              <CardDescription>
                Generate API keys for programmatic access to the REST API. Keys
                use <code className="text-xs">Bearer</code> authentication and
                can be restricted by IP address. Keys are shown only once when
                created.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApiForm enabled={Boolean(apiEnabled)} keys={apiKeys} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-4 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>SMTP</CardTitle>
              <CardDescription>
                Used to send vendor invites and reminders. The password is
                encrypted at rest.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailForm
                smtpHost={email.smtpHost}
                smtpPort={email.smtpPort}
                smtpUser={email.smtpUser}
                fromAddress={email.fromAddress}
                fromName={email.fromName}
                smtpPasswordConfigured={email.smtpPasswordConfigured}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email templates</CardTitle>
              <CardDescription>
                Subject and body for invite, reminder, and escalation emails.
                Use {"{{"}tokens{"}}"} for dynamic values.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailTemplateForm
                inviteSubject={templates.inviteSubject}
                inviteBody={templates.inviteBody}
                invitePasswordSubject={templates.invitePasswordSubject}
                invitePasswordBody={templates.invitePasswordBody}
                reminderSubject={templates.reminderSubject}
                reminderBody={templates.reminderBody}
                escalationSubject={templates.escalationSubject}
                escalationBody={templates.escalationBody}
                submissionSubject={templates.submissionSubject}
                submissionBody={templates.submissionBody}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="email-tracking"
          className="mt-4 flex flex-col gap-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Email tracking</CardTitle>
              <CardDescription>
                View the status of every email sent by the platform. Entries are
                retained according to the configured retention policy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailTrackingForm
                result={emailLogs}
                statuses={emailLogStatuses}
                types={emailLogTypes}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scoring" className="mt-4 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Scoring</CardTitle>
              <CardDescription>
                Risk weights and the red/amber/green cut‑offs used for vendor
                profiles and the gap heatmap.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScoringForm
                riskWeightCritical={scoring?.riskWeights.CRITICAL ?? 10}
                riskWeightHigh={scoring?.riskWeights.HIGH ?? 6}
                riskWeightMedium={scoring?.riskWeights.MEDIUM ?? 3}
                riskWeightLow={scoring?.riskWeights.LOW ?? 1}
                ragAmber={scoring?.ragThresholds.amber ?? 0.6}
                ragGreen={scoring?.ragThresholds.green ?? 0.85}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduling" className="mt-4 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Scheduling</CardTitle>
              <CardDescription>
                Automated reminders before the due date and reviewer escalations
                for overdue assessments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SchedulingForm
                reminderOffsetDays={assessment.reminderOffsetDays}
                escalationAfterDays={assessment.escalationAfterDays}
                defaultDueInDays={assessment.defaultDueInDays}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="mt-4 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Limits & retention</CardTitle>
              <CardDescription>
                Login rate limiting, data retention policies, and file upload
                constraints.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LimitsForm
                loginRateLimitPerMin={assessment.loginRateLimitPerMin}
                auditRetentionDays={auditRetention}
                emailLogRetentionDays={emailLogRetention}
                maxUploadMb={files.maxUploadMb}
                allowedExtensions={files.allowedExtensions}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sso" className="mt-4 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Single sign‑on</CardTitle>
              <CardDescription>
                Allow staff to sign in with Microsoft Entra ID, Google
                Workspace, or a custom OIDC provider. Client credentials are
                encrypted at rest.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SsoForm
                entraIdEnabled={sso.entraIdEnabled}
                entraIdClientId={sso.entraIdClientId}
                entraIdSecretConfigured={ssoSecrets.entraId}
                googleEnabled={sso.googleEnabled}
                googleClientId={sso.googleClientId}
                googleSecretConfigured={ssoSecrets.google}
                oidcEnabled={sso.oidcEnabled}
                oidcName={sso.oidcName}
                oidcIssuer={sso.oidcIssuer}
                oidcClientId={sso.oidcClientId}
                oidcSecretConfigured={ssoSecrets.oidc}
                autoProvisionRole={sso.autoProvisionRole}
                allowedDomain={sso.allowedDomain}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4 flex flex-col gap-6">
          <AddUserForm />

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Staff accounts</h3>
            {fullUsers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No users yet.</p>
            ) : (
              <div className="flex flex-col divide-y rounded-lg border">
                {fullUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-3 p-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {user.name}{" "}
                        <span className="text-muted-foreground text-xs">
                          {user.email}
                        </span>
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {user.role === "ADMIN" ? "Admin" : "Reviewer"}
                        {user.disabled ? " · Disabled" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <form
                        action={changeRoleAction}
                        className="flex items-center gap-1"
                      >
                        <input type="hidden" name="userId" value={user.id} />
                        <Select name="role" defaultValue={user.role}>
                          <SelectTrigger className="h-8 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="REVIEWER">Reviewer</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button type="submit" size="sm" variant="ghost">
                          Change role
                        </Button>
                      </form>
                      <form
                        id={`toggle-user-${user.id}`}
                        action={toggleUserAction}
                      >
                        <input type="hidden" name="userId" value={user.id} />
                        <input
                          type="hidden"
                          name="disabled"
                          value={user.disabled ? "false" : "true"}
                        />
                        {user.disabled ? (
                          <Button type="submit" size="sm" variant="ghost">
                            Enable
                          </Button>
                        ) : (
                          <ConfirmDialog
                            title="Disable user?"
                            description={`${user.name} will no longer be able to sign in. Their data will be preserved.`}
                            confirmLabel="Disable"
                            formId={`toggle-user-${user.id}`}
                          >
                            <Button type="button" size="sm" variant="ghost">
                              Disable
                            </Button>
                          </ConfirmDialog>
                        )}
                      </form>
                      <form
                        id={`reset-password-${user.id}`}
                        action={resetPasswordAction}
                        className="flex items-center gap-1"
                      >
                        <input type="hidden" name="userId" value={user.id} />
                        <input
                          name="password"
                          type="password"
                          placeholder="New password"
                          minLength={12}
                          className="border-input bg-background h-8 rounded-md border px-2 text-xs"
                        />
                        <ConfirmDialog
                          title="Reset password?"
                          description={`This will overwrite ${user.name}'s current password. They will need to use the new password to sign in.`}
                          confirmLabel="Reset"
                          formId={`reset-password-${user.id}`}
                        >
                          <Button type="button" size="sm" variant="ghost">
                            Reset
                          </Button>
                        </ConfirmDialog>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="audit" className="mt-4 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit log</CardTitle>
              <CardDescription>
                Track administrative and system activity across the platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuditForm result={auditLogs} actions={actions} users={users} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
