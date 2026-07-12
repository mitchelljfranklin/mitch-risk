"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
} from "@/app/(internal)/settings/actions";

const EVENT_LABELS: Record<string, string> = {
  ASSESSMENT_SUBMITTED: "Assessment submitted",
  ASSESSMENT_OVERDUE: "Assessment overdue",
  FINDING_CREATED: "Finding created",
  FINDING_RESOLVED: "Finding resolved",
  CERTIFICATION_EXPIRING: "Certification expiring",
};

const PLATFORM_OPTIONS: { value: WebhookPlatform; label: string }[] = [
  { value: "GENERIC", label: "Generic (HTTP)" },
  { value: "SLACK", label: "Slack" },
  { value: "MICROSOFT_TEAMS", label: "Microsoft Teams" },
  { value: "DISCORD", label: "Discord" },
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
          Webhook endpoints ({endpoints.length})
        </h3>
        {!showNew ? (
          <Button size="sm" onClick={() => setShowNew(true)}>
            Add endpoint
          </Button>
        ) : null}
      </div>

      {showNew ? (
        <form
          action={createAction}
          className="flex flex-col gap-3 rounded-md border p-4"
        >
          <h4 className="text-sm font-medium">New webhook</h4>
          <div className="grid gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="webhookName" className="text-xs">
                Name
              </Label>
              <Input
                id="webhookName"
                name="name"
                placeholder="e.g. Slack alerts, Teams compliance"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="webhookUrl" className="text-xs">
                URL
              </Label>
              <Input
                id="webhookUrl"
                name="url"
                placeholder="https://example.com/webhooks/mitch-risk"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="webhookPlatform" className="text-xs">
                Platform
              </Label>
              <Select name="platform" defaultValue="GENERIC">
                <SelectTrigger id="webhookPlatform">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Events</Label>
              <div className="flex flex-wrap gap-3">
                {Object.entries(EVENT_LABELS).map(([event, label]) => (
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
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SubmitButton type="submit" size="sm" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create"}
            </SubmitButton>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNew(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {endpoints.length === 0 && !showNew ? (
        <p className="text-muted-foreground text-sm">
          No webhooks configured. Add an endpoint to receive event
          notifications.
        </p>
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
                    {endpoint.enabled ? "Active" : "Disabled"}
                  </Badge>
                  <form action={toggleWebhookAction}>
                    <input type="hidden" name="webhookId" value={endpoint.id} />
                    <input
                      type="hidden"
                      name="enabled"
                      value={endpoint.enabled ? "false" : "true"}
                    />
                    <Button type="submit" variant="ghost" size="sm">
                      {endpoint.enabled ? "Disable" : "Enable"}
                    </Button>
                  </form>
                  <form
                    id={`delete-webhook-${endpoint.id}`}
                    action={deleteWebhookAction}
                  >
                    <input type="hidden" name="webhookId" value={endpoint.id} />
                    <ConfirmDialog
                      title="Delete webhook?"
                      description={`This endpoint will stop receiving events: ${endpoint.url}`}
                      confirmLabel="Delete"
                      formId={`delete-webhook-${endpoint.id}`}
                    >
                      <Button type="button" variant="ghost" size="sm">
                        Delete
                      </Button>
                    </ConfirmDialog>
                  </form>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[10px]">
                  {PLATFORM_OPTIONS.find(
                    (opt) => opt.value === endpoint.platform,
                  )?.label ?? endpoint.platform}
                </Badge>
                {endpoint.events.map((event) => (
                  <Badge key={event} variant="outline" className="text-[10px]">
                    {EVENT_LABELS[event] ?? event}
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
