"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ProfileState, updateProfileAction } from "@/lib/actions/profile";
import { useActionFeedback } from "@/hooks/use-action-feedback";

const initialState: ProfileState = undefined;

type ProfileFormProps = {
  name: string;
  email: string;
  hasLocalPassword: boolean;
  isSsoUser: boolean;
};

export function ProfileForm({
  name,
  email,
  hasLocalPassword,
  isSsoUser,
}: ProfileFormProps) {
  const translations = useTranslations("Profile");
  const [state, formAction, isPending] = useActionState(
    updateProfileAction,
    initialState,
  );
  useActionFeedback(state);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{translations("accountDetails")}</CardTitle>
          <CardDescription>
            {isSsoUser
              ? translations("ssoDescription")
              : translations("localDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="name">{translations("name")}</Label>
            <Input id="name" name="name" defaultValue={name} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">{translations("email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={email}
              required={hasLocalPassword}
              readOnly={!hasLocalPassword}
              aria-readonly={!hasLocalPassword}
              className={
                !hasLocalPassword ? "text-muted-foreground" : undefined
              }
            />
          </div>
        </CardContent>
      </Card>

      {hasLocalPassword ? (
        <Card>
          <CardHeader>
            <CardTitle>{translations("passwordTitle")}</CardTitle>
            <CardDescription>
              {translations("passwordDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="currentPassword">
                {translations("currentPassword")}
              </Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="newPassword">
                  {translations("newPassword")}{" "}
                  <span className="text-muted-foreground font-normal">
                    {translations("optional")}
                  </span>
                </Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmNewPassword">
                  {translations("confirmNewPassword")}
                </Label>
                <Input
                  id="confirmNewPassword"
                  name="confirmNewPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-muted-foreground text-sm">
          {translations("ssoPasswordNote")}
        </p>
      )}

      {state?.message && !state.ok ? (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? translations("saving") : translations("saveChanges")}
        </Button>
      </div>
    </form>
  );
}
