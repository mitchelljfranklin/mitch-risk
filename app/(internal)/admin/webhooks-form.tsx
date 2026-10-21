"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import type { WebhookPlatform } from "../../../prisma/generated/prisma/client";
import {
  createWebhookAction,
  deleteWebhookAction,
  toggleWebhookAction,
} from "./actions";

const EVENT_VALUES = [
  "ASSESSMENT_SUBMITTED",
  "ASSESSMENT_OVERDUE",
  "FINDING_CREATED",
  "FINDING_RESOLVED",
  "CERTIFICATION_EXPIRING",
] as const;

const PLATFORM_OPTIONS: { value: WebhookPlatform }[] = [
  { value: "GENERIC" },
  { value: "SLACK" },
  { value: "MICROSOFT_TEAMS" },
  { value: "DISCORD" },
];

type WebhookRow = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  events: string[];
  platform: WebhookPlatform;
  createdAt: Date;
};

type WebhooksFormProps = {
  endpoints: WebhookRow[];
};

export function WebhooksForm({ endpoints }: WebhooksFormProps) {
  const router = useRouter();
  const translations = useTranslations("Admin.webhooks");
  const [showNew, setShowNew] = useState(false);
  const [createState, createAction, isCreating] = useActionState(
    createWebhookAction,
    undefined,
  );
  useActionFeedback(createState);

  const prevOkRef = useRef(createState?.ok);

  useEffect(() => {
    if (createState?.ok && !prevOkRef.current) {
      setShowNew(false);
      router.refresh();
    }
    prevOkRef.current = createState?.ok ?? false;
  }, [createState, router]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          {translations("endpointsTitle", { count: endpoints.length })}
        </h3>
        {!showNew ? (
          <Button size="sm" onClick={() => setShowNew(true)}>
            {translations("add")}
          </Button>
        ) : null}
      </div>

      {showNew ? (
        <form
          action={createAction}
          className="flex flex-col gap-3 rounded-md border p-4"
        >
          <h4 className="text-sm font-medium">{translations("newTitle")}</h4>
          <div className="grid gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="webhookName" className="text-xs">
                {translations("name")}
              </Label>
              <Input
                id="webhookName"
                name="name"
                placeholder={translations("namePlaceholder")}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="webhookUrl" className="text-xs">
                {translations("url")}
              </Label>
              <Input
                id="webhookUrl"
                name="url"
                placeholder={translations("urlPlaceholder")}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="webhookPlatform" className="text-xs">
                {translations("platform")}
              </Label>
              <Select name="platform" defaultValue="GENERIC">
                <SelectTrigger id="webhookPlatform">
                  <SelectValue
                    placeholder={translations("platformPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {translations(`platforms.${option.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">{translations("events")}</Label>
              <div className="flex flex-wrap gap-3">
                {EVENT_VALUES.map((event) => (
                  <div key={event} className="flex items-center gap-2">
                    <Checkbox
                      id={`event-${event}`}
                      name="events"
                      value={event}
                      defaultChecked
                    />
                    <Label
                      htmlFor={`event-${event}`}
                      className="text-xs font-normal"
                    >
                      {translations(`eventLabels.${event}`)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SubmitButton type="submit" size="sm" disabled={isCreating}>
              {isCreating ? translations("creating") : translations("create")}
            </SubmitButton>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNew(false)}
            >
              {translations("cancel")}
            </Button>
          </div>
        </form>
      ) : null}

      {endpoints.length === 0 && !showNew ? (
        <p className="text-muted-foreground text-sm">{translations("empty")}</p>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {endpoints.map((endpoint) => (
            <div key={endpoint.id} className="flex flex-col gap-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  {endpoint.name ? (
                    <span className="text-sm font-medium">{endpoint.name}</span>
                  ) : null}
                  <span className="text-muted-foreground block truncate text-xs">
                    {endpoint.url}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant={endpoint.enabled ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {endpoint.enabled
                      ? translations("active")
                      : translations("disabled")}
                  </Badge>
                  <form action={toggleWebhookAction}>
                    <input type="hidden" name="webhookId" value={endpoint.id} />
                    <input
                      type="hidden"
                      name="enabled"
                      value={endpoint.enabled ? "false" : "true"}
                    />
                    <Button type="submit" variant="ghost" size="sm">
                      {endpoint.enabled
                        ? translations("disable")
                        : translations("enable")}
                    </Button>
                  </form>
                  <form
                    id={`delete-webhook-${endpoint.id}`}
                    action={deleteWebhookAction}
                  >
                    <input type="hidden" name="webhookId" value={endpoint.id} />
                    <ConfirmDialog
                      title={translations("deleteTitle")}
                      description={translations("deleteDescription", {
                        url: endpoint.url,
                      })}
                      confirmLabel={translations("delete")}
                      formId={`delete-webhook-${endpoint.id}`}
                    >
                      <Button type="button" variant="ghost" size="sm">
                        {translations("delete")}
                      </Button>
                    </ConfirmDialog>
                  </form>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[10px]">
                  {translations(`platforms.${endpoint.platform}`)}
                </Badge>
                {endpoint.events.map((event) => (
                  <Badge key={event} variant="outline" className="text-[10px]">
                    {translations(`eventLabels.${event}`)}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
