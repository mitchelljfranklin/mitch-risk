"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createInitialAdmin, type SetupState } from "./actions";

const initialState: SetupState = undefined;

export function SetupForm() {
  const t = useTranslations("Auth.setup");
  const [state, formAction, isPending] = useActionState(
    createInitialAdmin,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">{t("fullName")}</Label>
        <Input id="name" name="name" autoComplete="name" required />
      </div>
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
          autoComplete="new-password"
          minLength={12}
          required
        />
        <p className="text-muted-foreground text-xs">{t("passwordHint")}</p>
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
