"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/lib/i18n/config";

import { saveOrganizationSettings, type SettingsActionState } from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type OrganizationFormProps = {
  name: string;
  supportEmail: string;
  defaultLocale: Locale;
};

const initialState: SettingsActionState = undefined;

export function OrganizationForm({
  name,
  supportEmail,
  defaultLocale,
}: OrganizationFormProps) {
  const translations = useTranslations("Admin.general.form");
  const [state, formAction, isPending] = useActionState(
    saveOrganizationSettings,
    initialState,
  );
  useActionFeedback(state);

  return (
    <form action={formAction} className="grid max-w-md gap-4">
      <div className="grid gap-2">
        <Label htmlFor="org-name">{translations("name")}</Label>
        <Input id="org-name" name="name" defaultValue={name} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="org-support-email">
          {translations("supportEmail")}
        </Label>
        <Input
          id="org-support-email"
          name="supportEmail"
          type="email"
          defaultValue={supportEmail}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="org-default-locale">
          {translations("defaultLanguage")}
        </Label>
        <Select name="defaultLocale" defaultValue={defaultLocale}>
          <SelectTrigger id="org-default-locale">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCALES.map((locale) => (
              <SelectItem key={locale} value={locale}>
                {LOCALE_LABELS[locale]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          {translations("defaultLanguageHint")}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? translations("saving") : translations("save")}
        </Button>
      </div>
    </form>
  );
}
