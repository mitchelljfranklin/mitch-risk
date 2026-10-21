"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  saveEmailSettings,
  sendSmtpTestAction,
  type SettingsActionState,
} from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

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
  const translations = useTranslations("Admin.email.form");
  const [state, formAction, isPending] = useActionState(
    saveEmailSettings,
    initialState,
  );
  useActionFeedback(state);

  return (
    <form action={formAction} className="grid max-w-md gap-4">
      <div className="grid gap-2">
        <Label htmlFor="smtp-host">{translations("host")}</Label>
        <Input id="smtp-host" name="smtpHost" defaultValue={smtpHost} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="smtp-port">{translations("port")}</Label>
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
        <Label htmlFor="smtp-user">{translations("username")}</Label>
        <Input id="smtp-user" name="smtpUser" defaultValue={smtpUser} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="smtp-password">{translations("password")}</Label>
        <Input
          id="smtp-password"
          name="smtpPassword"
          type="password"
          autoComplete="off"
          placeholder={
            smtpPasswordConfigured
              ? translations("passwordKeep")
              : translations("passwordEnter")
          }
        />
        <p className="text-muted-foreground text-xs">
          {translations("passwordHint")}
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="from-address">{translations("fromAddress")}</Label>
        <Input
          id="from-address"
          name="fromAddress"
          type="email"
          defaultValue={fromAddress}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="from-name">{translations("fromName")}</Label>
        <Input id="from-name" name="fromName" defaultValue={fromName} />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? translations("saving") : translations("save")}
        </Button>
      </div>
    </form>
  );
}

export function SmtpTestForm({
  currentUserEmail,
}: {
  currentUserEmail: string;
}) {
  const translations = useTranslations("Admin.email.test");
  const [testState, testAction, isTesting] = useActionState(
    sendSmtpTestAction,
    initialState,
  );
  useActionFeedback(testState);

  return (
    <form action={testAction} className="grid max-w-md gap-2">
      <Label htmlFor="test-recipient">{translations("label")}</Label>
      <div className="flex items-center gap-3">
        <Input
          id="test-recipient"
          name="recipient"
          type="email"
          defaultValue={currentUserEmail}
          placeholder={translations("placeholder")}
        />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={isTesting}
        >
          {isTesting ? translations("sending") : translations("send")}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">{translations("hint")}</p>
    </form>
  );
}
