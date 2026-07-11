import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { listAuditLogs, listAuditActions } from "@/lib/db/audit";
import { listStaffAccounts } from "@/lib/db/users";
import { listRoles } from "@/lib/db/roles";
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
  getStorageSettings,
} from "@/lib/settings";
import { getBreakGlassHash, getSsoSecretConfigured } from "@/lib/settings";
import { UsersManager } from "./users-manager";
import { RolesManager } from "./roles-manager";

import { EmailForm, SmtpTestForm } from "./email-form";
import { TemplatesManager } from "./templates-manager";
import { OrganizationForm } from "./organization-form";
import { ScoringForm } from "./scoring-form";
import { SsoForm } from "./sso-form";
import { AppearanceForm } from "./appearance-form";
import { ApiForm } from "./api-form";
import { AuditForm } from "./audit-form";
import { SchedulingForm } from "./scheduling-form";
import { LimitsForm } from "./limits-form";
import { StorageForm } from "./storage-form";
import { EmailTrackingForm } from "./email-tracking";
import { HealthTab } from "./health-tab";
import { WebhooksForm } from "./webhooks-form";
import { listEmailLogs } from "@/lib/db/notifications";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings" };

type SettingsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const currentUser = await requireAnyPermission([
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.ROLES_MANAGE,
    PERMISSIONS.API_MANAGE,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.WEBHOOKS_MANAGE,
  ]);
  const permissions = currentUser.permissions;
  const canManageSettings = hasPermission(
    permissions,
    PERMISSIONS.SETTINGS_MANAGE,
  );
  const canManageUsers = hasPermission(permissions, PERMISSIONS.USERS_MANAGE);
  const canManageRoles = hasPermission(permissions, PERMISSIONS.ROLES_MANAGE);
  const canManageApi = hasPermission(permissions, PERMISSIONS.API_MANAGE);
  const canViewAudit = hasPermission(permissions, PERMISSIONS.AUDIT_VIEW);
  const canManageWebhooks = hasPermission(
    permissions,
    PERMISSIONS.WEBHOOKS_MANAGE,
  );

  const sp = await searchParams;
  const [
    organization,
    email,
    templates,
    scoring,
    staffAccounts,
    roles,
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
    storageSettings,
  ] = await Promise.all([
    getOrganizationSettings(),
    getEmailSettings(),
    getEmailTemplateSettings(),
    getScoringSettings(),
    listStaffAccounts(),
    listRoles(),
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
        requestCount: true,
        allowedIps: true,
        rateLimitPerMin: true,
        permissions: true,
        createdAt: true,
      },
    }),
    prisma.appSetting
      .findUnique({ where: { key: "api.enabled" } })
      .then((settingsResult) => settingsResult?.value === true),
    listAuditActions(),
    getAssessmentSettings(),
    getFileSettings(),
    getAuditRetention(),
    getEmailLogRetention(),
    getStorageSettings(),
  ]);

  const webhookEndpoints = await prisma.webhookEndpoint.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      enabled: true,
      events: true,
      platform: true,
      createdAt: true,
    },
  });

  const breakGlassConfigured = (await getBreakGlassHash()) !== null;

  const cronLastRunRow = await prisma.appSetting.findUnique({
    where: { key: "cron.lastRun" },
  });
  const cronLastRun =
    cronLastRunRow && typeof cronLastRunRow.value === "string"
      ? cronLastRunRow.value
      : null;

  const users = staffAccounts.map((account) => ({
    id: account.id,
    name: account.name,
  }));
  const roleOptions = roles.map((role) => ({ id: role.id, name: role.name }));
  const roleViews = roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    isSystem: role.isSystem,
    userCount: role._count.users,
  }));

  const auditLogs = await listAuditLogs({
    action: sp.action,
    userId: sp.userId,
    fromDate: sp.fromDate,
    toDate: sp.toDate,
    page: sp.auditPage ? parseInt(sp.auditPage) : 1,
    pageSize: sp.auditPageSize ? parseInt(sp.auditPageSize) : undefined,
  });

  const emailLogs = await listEmailLogs({
    status: sp.status,
    type: sp.type,
    recipient: sp.recipient,
    fromDate: sp.fromDate,
    toDate: sp.toDate,
    page: sp.emailLogPage ? parseInt(sp.emailLogPage) : 1,
    pageSize: sp.emailLogPageSize ? parseInt(sp.emailLogPageSize) : undefined,
  });

  const emailLogStatuses = ["SENT", "FAILED"];
  const emailLogTypes = [
    "INVITE",
    "REMINDER",
    "ESCALATION",
    "SUBMISSION",
    "CLARIFICATION",
    "RESET",
    "TEST",
  ];

  const allowedTabs = [
    ...(canManageSettings
      ? [
          "general",
          "appearance",
          "email",
          "email-tracking",
          "scoring",
          "scheduling",
          "limits",
          "sso",
          "storage",
          "health",
        ]
      : []),
    ...(canManageUsers ? ["users"] : []),
    ...(canManageRoles ? ["roles"] : []),
    ...(canManageApi ? ["api"] : []),
    ...(canManageWebhooks ? ["webhooks"] : []),
    ...(canViewAudit ? ["audit"] : []),
  ];
  const defaultTab =
    sp.tab && allowedTabs.includes(sp.tab) ? sp.tab : allowedTabs[0];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage operational configuration. Changes apply immediately — no file
          edits required.
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <div className="overflow-x-auto">
          <TabsList>
            {canManageSettings ? (
              <>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="email-tracking">Email Tracking</TabsTrigger>
                <TabsTrigger value="scoring">Scoring</TabsTrigger>
                <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
                <TabsTrigger value="limits">Limits</TabsTrigger>
                <TabsTrigger value="storage">Storage</TabsTrigger>
                <TabsTrigger value="sso">SSO</TabsTrigger>
                <TabsTrigger value="health">Health</TabsTrigger>
              </>
            ) : null}
            {canManageUsers ? (
              <TabsTrigger value="users">Users</TabsTrigger>
            ) : null}
            {canManageRoles ? (
              <TabsTrigger value="roles">Roles</TabsTrigger>
            ) : null}
            {canManageApi ? <TabsTrigger value="api">API</TabsTrigger> : null}
            {canManageWebhooks ? (
              <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            ) : null}
            {canViewAudit ? (
              <TabsTrigger value="audit">Audit</TabsTrigger>
            ) : null}
          </TabsList>
        </div>

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
                logoKey={appearance.logoKey ?? ""}
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

        {canManageWebhooks ? (
          <TabsContent value="webhooks" className="mt-4 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Webhooks</CardTitle>
                <CardDescription>
                  Configure endpoints to receive event notifications when
                  assessments are submitted, findings change, or certifications
                  expire.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WebhooksForm endpoints={webhookEndpoints} />
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

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
              <div className="mt-6 border-t pt-6">
                <SmtpTestForm currentUserEmail={currentUser.email ?? ""} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email templates</CardTitle>
              <CardDescription>
                Select a template to edit its subject and body. Use {"{{"}tokens
                {"}}"} for dynamic values.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TemplatesManager templates={templates} />
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
                cronLastRun={cronLastRun}
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
                sessionTimeoutMinutes={assessment.sessionTimeoutMinutes}
                auditRetentionDays={auditRetention}
                emailLogRetentionDays={emailLogRetention}
                maxUploadMb={files.maxUploadMb}
                allowedExtensions={files.allowedExtensions}
                portalPageLoadsPerMin={assessment.portalPageLoadsPerMin}
                portalUploadsPerMin={assessment.portalUploadsPerMin}
                portalSubmitPerMin={assessment.portalSubmitPerMin}
                portalPasswordAttemptsPerMin={
                  assessment.portalPasswordAttemptsPerMin
                }
                passwordResetPerMin={assessment.passwordResetPerMin}
                breakGlassPerMin={assessment.breakGlassPerMin}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="mt-4 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>File storage</CardTitle>
              <CardDescription>
                Configure where evidence files and attachments are stored.
                Changing providers does not migrate existing files.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StorageForm defaults={storageSettings} />
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
                autoProvisionRoleId={sso.autoProvisionRoleId}
                roles={roleOptions}
                allowedDomain={sso.allowedDomain}
                disableLocalAuth={sso.disableLocalAuth}
                breakGlassConfigured={breakGlassConfigured}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="mt-4 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Roles</CardTitle>
              <CardDescription>
                Define permission sets and assign them to staff accounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RolesManager roles={roleViews} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Staff accounts</CardTitle>
              <CardDescription>
                Create staff accounts and manage their role, access, and
                password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsersManager
                users={staffAccounts}
                roles={roleOptions}
                currentUserId={currentUser.id}
              />
            </CardContent>
          </Card>
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

        {canManageSettings ? (
          <TabsContent value="health" className="mt-4 flex flex-col gap-6">
            <HealthTab />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
