"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type ResetPasswordState,
  resetPasswordAction,
} from "@/lib/actions/auth";

const initialState: ResetPasswordState = undefined;

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <div className="grid gap-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </div>
      {state?.ok ? (
        <p className="text-sm text-[var(--success)]" role="alert">
          {state.message}
        </p>
      ) : null}
      {!state?.ok && state?.message ? (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      ) : null}
      {!state?.ok ? (
        <>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Resetting..." : "Reset password"}
          </Button>
          <Link
            href="/login"
            className="text-muted-foreground text-center text-xs hover:underline"
          >
            Back to sign in
          </Link>
        </>
      ) : null}
    </form>
  );
}
