"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSignInSecuritySettings } from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type SignInSecurityFormProps = {
  loginRateLimitPerMin: number;
  sessionTimeoutMinutes: number;
};

export function SignInSecurityForm({
  loginRateLimitPerMin,
  sessionTimeoutMinutes,
}: SignInSecurityFormProps) {
  const translations = useTranslations("Admin.signIn.security");
  const [state, action, isPending] = useActionState(
    saveSignInSecuritySettings,
    undefined,
  );
  useActionFeedback(state);

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="loginRateLimit">{translations("loginRateLimit")}</Label>
        <p className="text-muted-foreground text-xs">
          {translations("loginRateLimitHint")}
        </p>
        <Input
          id="loginRateLimit"
          name="loginRateLimit"
          type="number"
          min={1}
          defaultValue={loginRateLimitPerMin}
          className="w-32"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sessionTimeoutMinutes">
          {translations("autoLogout")}
        </Label>
        <p className="text-muted-foreground text-xs">
          {translations("autoLogoutHint")}
        </p>
        <Input
          id="sessionTimeoutMinutes"
          name="sessionTimeoutMinutes"
          type="number"
          min={0}
          defaultValue={sessionTimeoutMinutes}
          className="w-32"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? translations("saving") : translations("save")}
        </Button>
      </div>
    </form>
  );
}
