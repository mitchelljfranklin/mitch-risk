"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveTrustCenterSettings } from "@/app/(internal)/settings/actions";
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
          <Label htmlFor="trustEnabled">Enable the trust center</Label>
        </div>
        <p className="text-muted-foreground text-xs">
          While disabled, <code>/trust</code> shows a not-found message and no
          content is served publicly.
        </p>{" "}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="trustIntro">Intro (markdown)</Label>
        <p className="text-muted-foreground text-xs">
          Short paragraph shown under the organisation name on the public page.
        </p>
        <Textarea
          id="trustIntro"
          name="intro"
          rows={3}
          defaultValue={intro}
          placeholder="Our commitment to security and privacy…"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="trustContactEmail">Contact email</Label>
        <p className="text-muted-foreground text-xs">
          Shown at the foot of the public page. Falls back to the
          organisation&apos;s support email when empty.
        </p>
        <Input
          id="trustContactEmail"
          name="contactEmail"
          type="email"
          defaultValue={contactEmail}
          placeholder="security@example.com"
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
            Link to the trust center in vendor invite emails
          </Label>
        </div>
        <p className="text-muted-foreground text-xs">
          Adds a footer line to invite emails pointing at <code>/trust</code>.
          Templates are not modified — the link is added at send time.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="trustPageLoadsPerMin">
            Public page loads / min (per IP)
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
            Document downloads / min (per IP)
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
          {isPending ? "Saving..." : "Save trust center"}
        </Button>
      </div>
    </form>
  );
}
