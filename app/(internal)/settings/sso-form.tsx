"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { type SettingsActionState, saveSsoSettings } from "./actions";

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
  autoProvisionRole: string;
  allowedDomain: string;
};

const SELECT_CLASS =
  "border-input bg-background h-9 rounded-md border px-3 text-sm";

const initialState: SettingsActionState = undefined;

function ProviderSection({
  label,
  enabledName,
  enabledDefault,
  clientIdName,
  clientIdDefault,
  clientSecretName,
  secretConfigured,
}: {
  label: string;
  enabledName: string;
  enabledDefault: boolean;
  clientIdName: string;
  clientIdDefault: string;
  clientSecretName: string;
  secretConfigured: boolean;
}) {
  return (
    <div className="grid gap-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name={enabledName}
            defaultChecked={enabledDefault}
            className="size-4"
          />
          Enabled
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={clientIdName}>Client ID</Label>
          <Input
            id={clientIdName}
            name={clientIdName}
            defaultValue={clientIdDefault}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={clientSecretName}>Client secret</Label>
          <Input
            id={clientSecretName}
            name={clientSecretName}
            type="password"
            autoComplete="off"
            placeholder={
              secretConfigured ? "Leave blank to keep current" : "Client secret"
            }
          />
          <p className="text-muted-foreground text-xs">
            Stored encrypted at rest and never displayed.
          </p>
        </div>
      </div>
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
  autoProvisionRole,
  allowedDomain,
}: SsoFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveSsoSettings,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <ProviderSection
        label="Microsoft Entra ID"
        enabledName="entraIdEnabled"
        enabledDefault={entraIdEnabled}
        clientIdName="entraIdClientId"
        clientIdDefault={entraIdClientId}
        clientSecretName="entraIdClientSecret"
        secretConfigured={entraIdSecretConfigured}
      />

      <ProviderSection
        label="Google Workspace"
        enabledName="googleEnabled"
        enabledDefault={googleEnabled}
        clientIdName="googleClientId"
        clientIdDefault={googleClientId}
        clientSecretName="googleClientSecret"
        secretConfigured={googleSecretConfigured}
      />

      <div className="grid gap-3 rounded-md border p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Custom OIDC</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="oidcEnabled"
              defaultChecked={oidcEnabled}
              className="size-4"
            />
            Enabled
          </label>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="oidcName">Provider display name</Label>
          <Input
            id="oidcName"
            name="oidcName"
            defaultValue={oidcName}
            placeholder="Okta / Auth0 / Keycloak"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="oidcIssuer">Issuer URL</Label>
          <Input
            id="oidcIssuer"
            name="oidcIssuer"
            defaultValue={oidcIssuer}
            placeholder="https://example.okta.com"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="oidcClientId">Client ID</Label>
            <Input
              id="oidcClientId"
              name="oidcClientId"
              defaultValue={oidcClientId}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="oidcClientSecret">Client secret</Label>
            <Input
              id="oidcClientSecret"
              name="oidcClientSecret"
              type="password"
              autoComplete="off"
              placeholder={
                oidcSecretConfigured
                  ? "Leave blank to keep current"
                  : "Client secret"
              }
            />
            <p className="text-muted-foreground text-xs">
              Stored encrypted at rest and never displayed.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="autoProvisionRole">
            Default role for new SSO users
          </Label>
          <select
            id="autoProvisionRole"
            name="autoProvisionRole"
            className={SELECT_CLASS}
            defaultValue={autoProvisionRole}
          >
            <option value="REVIEWER">Reviewer</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="allowedDomain">Restrict to domain (optional)</Label>
          <Input
            id="allowedDomain"
            name="allowedDomain"
            placeholder="@company.com"
            defaultValue={allowedDomain}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Saving…" : "Save SSO"}
        </Button>
        {state ? (
          <span
            className={
              state.ok
                ? "text-muted-foreground text-xs"
                : "text-destructive text-xs"
            }
            role="status"
          >
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
