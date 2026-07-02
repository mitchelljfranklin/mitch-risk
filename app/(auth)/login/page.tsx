import Link from "next/link";
import { redirect } from "next/navigation";

import { SsoButtons } from "@/components/auth/sso-buttons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { countUsers } from "@/lib/db/users";
import { getOrganizationSettings, getSsoSettings } from "@/lib/settings";

import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if ((await countUsers()) === 0) {
    redirect("/setup");
  }
  if (await getCurrentUser()) {
    redirect("/dashboard");
  }

  const [ssoSettings, organization] = await Promise.all([
    getSsoSettings(),
    getOrganizationSettings(),
  ]);
  const ssoProviders: { id: string; label: string }[] = [];
  if (ssoSettings.entraIdEnabled) {
    ssoProviders.push({
      id: "microsoft-entra-id",
      label: "Microsoft Entra ID",
    });
  }
  if (ssoSettings.googleEnabled) {
    ssoProviders.push({ id: "google", label: "Google Workspace" });
  }
  if (ssoSettings.oidcEnabled) {
    ssoProviders.push({
      id: "oidc",
      label: ssoSettings.oidcName || "Single Sign‑On",
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{organization.name}</CardTitle>
        <CardDescription>Sign in to your account.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <LoginForm />
        <Link
          href="/forgot-password"
          className="hover:text-primary text-muted-foreground -mt-2 text-center text-xs hover:underline"
        >
          Forgot password?
        </Link>
        {ssoProviders.length > 0 ? (
          <SsoButtons providers={ssoProviders} />
        ) : null}
      </CardContent>
    </Card>
  );
}
