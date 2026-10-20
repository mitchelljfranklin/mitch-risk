"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createTemplateAction, type FormState } from "@/lib/actions/templates";

const initialState: FormState = undefined;

export function NewTemplateForm() {
  const translations = useTranslations("Templates.new.form");
  const [state, formAction, isPending] = useActionState(
    createTemplateAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">{translations("name")}</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">{translations("description")}</Label>
        <Input id="description" name="description" />
      </div>
      {state?.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? translations("creating") : translations("create")}
        </Button>
        <Button asChild variant="outline">
          <Link href="/templates">{translations("cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
