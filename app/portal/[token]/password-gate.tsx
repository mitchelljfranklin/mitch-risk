"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validatePortalPassword } from "./actions";

type PasswordGateProps = {
  token: string;
};

export function PasswordGate({ token }: PasswordGateProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (
      previousState: { ok: boolean; message?: string } | undefined,
      formData: FormData,
    ) => {
      const password = (formData.get("password") as string) || "";
      const result = await validatePortalPassword(token, password);
      if (result.ok) {
        router.refresh();
      }
      return result;
    },
    undefined,
  );

  return (
    <form
      action={formAction}
      className="mt-24 flex flex-col items-center gap-4"
    >
      <h1 className="text-xl font-semibold tracking-tight">
        Password required
      </h1>
      <p className="text-muted-foreground text-center text-sm">
        This questionnaire is password protected. Enter the password provided by
        the requester to continue.
      </p>
      <div className="flex w-64 flex-col gap-2">
        <Label htmlFor="portal-password" className="sr-only">
          Password
        </Label>
        <Input
          id="portal-password"
          name="password"
          type="password"
          placeholder="Enter password"
          autoFocus
          required
        />
      </div>
      {state?.message ? (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Verifying..." : "Continue"}
      </Button>
    </form>
  );
}
