"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { saveEmailSettings, type SettingsActionState } from "./actions";

type EmailFormProps = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  fromAddress: string;
  fromName: string;
  smtpPasswordConfigured: boolean;
};

const initialState: SettingsActionState = undefined;

export function EmailForm({
  smtpHost,
  smtpPort,
  smtpUser,
  fromAddress,
  fromName,
  smtpPasswordConfigured,
}: EmailFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveEmailSettings,
    initialState,
  );

  return (
    <form action={formAction} className="grid max-w-md gap-4">
      <div className="grid gap-2">
        <Label htmlFor="smtp-host">SMTP host</Label>
        <Input id="smtp-host" name="smtpHost" defaultValue={smtpHost} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="smtp-port">SMTP port</Label>
        <Input
          id="smtp-port"
          name="smtpPort"
          type="number"
          min={1}
          max={65535}
          defaultValue={smtpPort}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="smtp-user">SMTP username</Label>
        <Input id="smtp-user" name="smtpUser" defaultValue={smtpUser} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="smtp-password">SMTP password</Label>
        <Input
          id="smtp-password"
          name="smtpPassword"
          type="password"
          autoComplete="off"
          placeholder={
            smtpPasswordConfigured
              ? "Leave blank to keep current password"
              : "Enter SMTP password"
          }
        />
        <p className="text-muted-foreground text-xs">
          Stored encrypted at rest and never displayed.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="from-address">From address</Label>
        <Input
          id="from-address"
          name="fromAddress"
          type="email"
          defaultValue={fromAddress}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="from-name">From name</Label>
        <Input id="from-name" name="fromName" defaultValue={fromName} />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Saving..." : "Save"}
        </Button>
        {state ? (
          <span
            className={
              state.ok
                ? "text-muted-foreground text-sm"
                : "text-destructive text-sm"
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
