"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { authenticate, type LoginState } from "./actions";

const initialState: LoginState = undefined;

export function LoginForm() {
  const t = useTranslations("Auth.login");
  const [state, formAction, isPending] = useActionState(
    authenticate,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state?.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
