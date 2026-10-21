"use client";

import { type ReactNode } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyLink } from "@/components/copy-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  type SettingsActionState,
  generateBreakGlassUrlAction,
  saveSsoSettings,
} from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type SsoFormProps = {
  entraIdEnabled: boolean;
  entraIdClientId: string;
  entraIdSecretConfigured: boolean;
  googleEnabled: boolean;
  googleClientId: string;
  googleSecretConfigured: boolean;
  oidcEnabled: boolean;
  oidcName: string;
  oidcIssuer: string;
  oidcClientId: string;
  oidcSecretConfigured: boolean;
  autoProvisionRoleId: string;
  roles: { id: string; name: string }[];
  allowedDomain: string;
  disableLocalAuth: boolean;
  breakGlassConfigured: boolean;
};

const initialState: SettingsActionState = undefined;

const breakGlassInitialState:
  { ok: boolean; message: string; url?: string } | undefined = undefined;

function BreakGlassSection({
  breakGlassConfigured,
}: {
  breakGlassConfigured: boolean;
}) {
  const translations = useTranslations("Admin.signIn.breakGlass");
  const [state, formAction, isPending] = useActionState(
    generateBreakGlassUrlAction,
    breakGlassInitialState,
  );
  useActionFeedback(state);

  return (
    <div className="grid gap-3 rounded-md border p-3">
      <p className="text-sm font-medium">{translations("title")}</p>
      <p className="text-muted-foreground text-xs">
        {translations("description")}{" "}
        {breakGlassConfigured
          ? translations("configured")
          : translations("notConfigured")}
      </p>
      {state?.ok && state.url ? <CopyLink value={state.url} /> : null}
      <form action={formAction}>
        <Button type="submit" variant="outline" size="sm" disabled={isPending}>
          {isPending
            ? translations("generating")
            : breakGlassConfigured
              ? translations("regenerate")
              : translations("generate")}
        </Button>
      </form>
    </div>
  );
}

function ProviderSection({
  label,
  enabledName,
  enabledDefault,
  clientIdName,
  clientIdDefault,
  clientSecretName,
  secretConfigured,
  children,
}: {
  label: string;
  enabledName: string;
  enabledDefault: boolean;
  clientIdName: string;
  clientIdDefault: string;
  clientSecretName: string;
  secretConfigured: boolean;
  children?: ReactNode;
}) {
  const translations = useTranslations("Admin.signIn.sso");

  return (
    <div className="grid gap-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            key={String(enabledDefault)}
            name={enabledName}
            defaultChecked={enabledDefault}
          />
          {translations("enabled")}
        </label>
      </div>
      {children ? (
        children
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={clientIdName}>{translations("clientId")}</Label>
            <Input
              id={clientIdName}
              name={clientIdName}
              defaultValue={clientIdDefault}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={clientSecretName}>
              {translations("clientSecret")}
            </Label>
            <Input
              id={clientSecretName}
              name={clientSecretName}
              type="password"
              autoComplete="off"
              placeholder={
                secretConfigured
                  ? translations("secretKeep")
                  : translations("secretEnter")
              }
            />
            <p className="text-muted-foreground text-xs">
              {translations("secretHint")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function SsoForm({
  entraIdEnabled,
  entraIdClientId,
  entraIdSecretConfigured,
  googleEnabled,
  googleClientId,
  googleSecretConfigured,
  oidcEnabled,
  oidcName,
  oidcIssuer,
  oidcClientId,
  oidcSecretConfigured,
  autoProvisionRoleId,
  roles,
  allowedDomain,
  disableLocalAuth,
  breakGlassConfigured,
}: SsoFormProps) {
  const translations = useTranslations("Admin.signIn.sso");
  const [state, formAction, isPending] = useActionState(
    saveSsoSettings,
    initialState,
  );
  useActionFeedback(state);

  return (
    <div className="grid gap-6">
      <form action={formAction} className="grid gap-4">
        <ProviderSection
          label={translations("entraId")}
          enabledName="entraIdEnabled"
          enabledDefault={entraIdEnabled}
          clientIdName="entraIdClientId"
          clientIdDefault={entraIdClientId}
          clientSecretName="entraIdClientSecret"
          secretConfigured={entraIdSecretConfigured}
        />

        <ProviderSection
          label={translations("google")}
          enabledName="googleEnabled"
          enabledDefault={googleEnabled}
          clientIdName="googleClientId"
          clientIdDefault={googleClientId}
          clientSecretName="googleClientSecret"
          secretConfigured={googleSecretConfigured}
        />

        <ProviderSection
          label={translations("oidc")}
          enabledName="oidcEnabled"
          enabledDefault={oidcEnabled}
          clientIdName="oidcClientId"
          clientIdDefault={oidcClientId}
          clientSecretName="oidcClientSecret"
          secretConfigured={oidcSecretConfigured}
        >
          <div className="grid gap-2">
            <Label htmlFor="oidcName">{translations("displayName")}</Label>
            <Input
              id="oidcName"
              name="oidcName"
              defaultValue={oidcName}
              placeholder={translations("displayNamePlaceholder")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="oidcIssuer">{translations("issuerUrl")}</Label>
            <Input
              id="oidcIssuer"
              name="oidcIssuer"
              defaultValue={oidcIssuer}
              placeholder={translations("issuerPlaceholder")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="oidcClientId">{translations("clientId")}</Label>
              <Input
                id="oidcClientId"
                name="oidcClientId"
                defaultValue={oidcClientId}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="oidcClientSecret">
                {translations("clientSecret")}
              </Label>
              <Input
                id="oidcClientSecret"
                name="oidcClientSecret"
                type="password"
                autoComplete="off"
                placeholder={
                  oidcSecretConfigured
                    ? translations("secretKeep")
                    : translations("secretEnter")
                }
              />
              <p className="text-muted-foreground text-xs">
                {translations("secretHint")}
              </p>
            </div>
          </div>
        </ProviderSection>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="autoProvisionRoleId">
              {translations("defaultRole")}
            </Label>
            <Select
              key={autoProvisionRoleId}
              name="autoProvisionRoleId"
              defaultValue={
                autoProvisionRoleId ||
                roles.find((role) => role.name === "Reviewer")?.id
              }
            >
              <SelectTrigger id="autoProvisionRoleId">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="allowedDomain">
              {translations("allowedDomain")}
            </Label>
            <Input
              id="allowedDomain"
              name="allowedDomain"
              placeholder={translations("allowedDomainPlaceholder")}
              defaultValue={allowedDomain}
            />
          </div>
        </div>

        <div className="grid gap-2 rounded-md border p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              key={String(disableLocalAuth)}
              name="disableLocalAuth"
              defaultChecked={disableLocalAuth}
            />
            {translations("disableLocalAuth")}
          </label>
          <p className="text-muted-foreground text-xs">
            {translations("disableLocalAuthHint")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isPending} size="sm">
            {isPending ? translations("saving") : translations("save")}
          </Button>
        </div>
      </form>

      <BreakGlassSection breakGlassConfigured={breakGlassConfigured} />
    </div>
  );
}
