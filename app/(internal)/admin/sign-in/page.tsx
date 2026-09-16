import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  getAssessmentSettings,
  getBreakGlassHash,
  getSsoSettings,
  getSsoSecretConfigured,
} from "@/lib/settings";
import { listRoles } from "@/lib/db/roles";
import { SsoForm } from "../sso-form";
import { SignInSecurityForm } from "../sign-in-security-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Sign-in" };

export default async function AdminSignInPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const [sso, ssoSecrets, roles, assessment] = await Promise.all([
    getSsoSettings(),
    getSsoSecretConfigured(),
    listRoles(),
    getAssessmentSettings(),
  ]);
  const roleOptions = roles.map((role) => ({ id: role.id, name: role.name }));
  const breakGlassConfigured = (await getBreakGlassHash()) !== null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign-in</h1>
        <p className="text-muted-foreground text-sm">
          How staff authenticate, and how long they stay signed in.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Single sign‑on</CardTitle>
          <CardDescription>
            Allow staff to sign in with Microsoft Entra ID, Google Workspace, or
            a custom OIDC provider. Client credentials are encrypted at rest.
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

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>
            Sign-in throttling and automatic logout for idle sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInSecurityForm
            loginRateLimitPerMin={assessment.loginRateLimitPerMin}
            sessionTimeoutMinutes={assessment.sessionTimeoutMinutes}
          />
        </CardContent>
      </Card>
    </div>
  );
}
