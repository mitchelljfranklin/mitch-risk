import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
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

export async function generateMetadata() {
  const translations = await getTranslations("Admin.signIn");
  return { title: translations("metaTitle") };
}

export default async function AdminSignInPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.signIn");

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
        <h1 className="text-2xl font-semibold tracking-tight">
          {translations("title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {translations("subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{translations("ssoTitle")}</CardTitle>
          <CardDescription>{translations("ssoDescription")}</CardDescription>
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
          <CardTitle>{translations("sessionsTitle")}</CardTitle>
          <CardDescription>
            {translations("sessionsDescription")}
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
