"use client";

import { type ReactNode } from "react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { type SettingsActionState, saveSsoSettings } from "./actions";
import { useFormToast } from "@/hooks/use-form-toast";

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
};

const initialState: SettingsActionState = undefined;

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
  return (
    <div className="grid gap-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name={enabledName} defaultChecked={enabledDefault} />
          Enabled
        </label>
      </div>
      {children ? (
        children
      ) : (
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
                secretConfigured
                  ? "Leave blank to keep current"
                  : "Client secret"
              }
            />
            <p className="text-muted-foreground text-xs">
              Stored encrypted at rest and never displayed.
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
}: SsoFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveSsoSettings,
    initialState,
  );
  useFormToast(state);

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

      <ProviderSection
        label="Custom OIDC"
        enabledName="oidcEnabled"
        enabledDefault={oidcEnabled}
        clientIdName="oidcClientId"
        clientIdDefault={oidcClientId}
        clientSecretName="oidcClientSecret"
        secretConfigured={oidcSecretConfigured}
      >
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
      </ProviderSection>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="autoProvisionRoleId">
            Default role for new SSO users
          </Label>
          <Select
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
          {isPending ? "Saving..." : "Save SSO"}
        </Button>
      </div>
    </form>
  );
}
