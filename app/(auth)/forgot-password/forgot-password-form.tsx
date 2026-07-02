"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type ForgotPasswordState,
  sendResetEmailAction,
} from "@/lib/actions/auth";

const initialState: ForgotPasswordState = undefined;

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    sendResetEmailAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      {state?.ok ? (
        <p className="text-sm text-[var(--rag-green)]">{state.message}</p>
      ) : (
        <>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          {state?.message ? (
            <p className="text-destructive text-sm" role="alert">
              {state.message}
            </p>
          ) : null}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Sending..." : "Send reset link"}
          </Button>
        </>
      )}
      <Link
        href="/login"
        className="text-muted-foreground text-center text-xs hover:underline"
      >
        Back to sign in
      </Link>
    </form>
  );
}
