"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveTrustCenterSettings } from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type TrustCenterSettingsFormProps = {
  enabled: boolean;
  intro: string;
  contactEmail: string;
  includeInInvites: boolean;
  pageLoadsPerMin: number;
  downloadsPerMin: number;
};

export function TrustCenterSettingsForm({
  enabled,
  intro,
  contactEmail,
  includeInInvites,
  pageLoadsPerMin,
  downloadsPerMin,
}: TrustCenterSettingsFormProps) {
  const translations = useTranslations("Admin.trustCenter");
  const [state, action, isPending] = useActionState(
    saveTrustCenterSettings,
    undefined,
  );
  useActionFeedback(state);

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Checkbox
            key={String(enabled)}
            id="trustEnabled"
            name="enabled"
            defaultChecked={enabled}
          />
          <Label htmlFor="trustEnabled">{translations("enabled")}</Label>
        </div>
        <p className="text-muted-foreground text-xs">
          {translations("enabledHint")}
        </p>{" "}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="trustIntro">{translations("intro")}</Label>
        <p className="text-muted-foreground text-xs">
          {translations("introHint")}
        </p>
        <Textarea
          id="trustIntro"
          name="intro"
          rows={3}
          defaultValue={intro}
          placeholder={translations("introPlaceholder")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="trustContactEmail">
          {translations("contactEmail")}
        </Label>
        <p className="text-muted-foreground text-xs">
          {translations("contactEmailHint")}
        </p>
        <Input
          id="trustContactEmail"
          name="contactEmail"
          type="email"
          defaultValue={contactEmail}
          placeholder={translations("contactEmailPlaceholder")}
          className="w-72"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Checkbox
            key={String(includeInInvites)}
            id="trustIncludeInInvites"
            name="includeInInvites"
            defaultChecked={includeInInvites}
          />
          <Label htmlFor="trustIncludeInInvites">
            {translations("includeInInvites")}
          </Label>
        </div>
        <p className="text-muted-foreground text-xs">
          {translations("includeInInvitesHint")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="trustPageLoadsPerMin">
            {translations("pageLoads")}
          </Label>
          <Input
            id="trustPageLoadsPerMin"
            name="pageLoadsPerMin"
            type="number"
            min={1}
            key={pageLoadsPerMin}
            defaultValue={pageLoadsPerMin}
            className="w-32"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="trustDownloadsPerMin">
            {translations("downloads")}
          </Label>
          <Input
            id="trustDownloadsPerMin"
            name="downloadsPerMin"
            type="number"
            min={1}
            key={downloadsPerMin}
            defaultValue={downloadsPerMin}
            className="w-32"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? translations("saving") : translations("save")}
        </Button>
      </div>
    </form>
  );
}
