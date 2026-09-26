"use client";

import { useActionState } from "react";

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
  const [state, action, isPending] = useActionState(
    saveSignInSecuritySettings,
    undefined,
  );
  useActionFeedback(state);

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="loginRateLimit">Login rate limit (per minute)</Label>
        <p className="text-muted-foreground text-xs">
          Maximum sign-in attempts per IP address per minute. Increase for
          shared-office environments behind a single public IP.
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
        <Label htmlFor="sessionTimeoutMinutes">Auto-logout (minutes)</Label>
        <p className="text-muted-foreground text-xs">
          Automatically sign out after this many minutes of inactivity. Set to 0
          to disable. Minimum 5 minutes when enabled.
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
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
