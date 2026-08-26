"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSchedulingSettings } from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type SchedulingFormProps = {
  reminderOffsetDays: number[];
  escalationAfterDays: number;
  defaultDueInDays: number;
  cronLastRun: string | null;
  internalSchedulerEnabled: boolean;
};

export function SchedulingForm({
  reminderOffsetDays,
  escalationAfterDays,
  defaultDueInDays,
  cronLastRun,
  internalSchedulerEnabled,
}: SchedulingFormProps) {
  const [state, action, isPending] = useActionState(
    saveSchedulingSettings,
    undefined,
  );
  useActionFeedback(state);

  const [reminderDays, setReminderDays] = useState<string>(
    reminderOffsetDays.join(", "),
  );

  const cronLabel = (() => {
    if (!cronLastRun) return "Never";
    const then = new Date(cronLastRun);
    const diffMs = new Date().getTime() - then.getTime();
    if (diffMs < 0) return "just now";
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "less than a minute ago";
    if (minutes === 1) return "1 minute ago";
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "1 hour ago";
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  })();

  return (
    <form action={action} className="flex flex-col gap-6">
      <input
        type="hidden"
        name="reminderDays"
        value={reminderDays
          .split(",")
          .map((day) => day.trim())
          .filter(Boolean)
          .join(",")}
      />

      <div className="flex flex-col gap-2">
        <Label>Reminder offset days</Label>
        <p className="text-muted-foreground text-xs">
          Comma-separated list of days before the due date to send reminders.
          Example: 7, 1 sends reminders 7 days and 1 day before the due date.
        </p>
        <Input
          value={reminderDays}
          onChange={(event) => setReminderDays(event.target.value)}
          placeholder="7, 1"
          className="w-48"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="escalationDays">Escalation after (days)</Label>
        <p className="text-muted-foreground text-xs">
          Days after the due date before the reviewer receives an escalation
          email.
        </p>
        <Input
          id="escalationDays"
          name="escalationDays"
          type="number"
          min={1}
          defaultValue={escalationAfterDays}
          className="w-32"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="defaultDueDays">Default assessment due (days)</Label>
        <p className="text-muted-foreground text-xs">
          New assessments default to this many days until the due date.
        </p>
        <Input
          id="defaultDueDays"
          name="defaultDueDays"
          type="number"
          min={1}
          defaultValue={defaultDueInDays}
          className="w-32"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Checkbox
            key={String(internalSchedulerEnabled)}
            id="internalSchedulerEnabled"
            name="internalSchedulerEnabled"
            defaultChecked={internalSchedulerEnabled}
          />
          <Label htmlFor="internalSchedulerEnabled">
            Run scheduled jobs inside the app
          </Label>
        </div>
        <p className="text-muted-foreground text-xs">
          When enabled, the application checks every five minutes for due
          reminders, escalations, expiry notices, recurring assessments, log
          pruning, and orphaned file cleanup — no external cron job or scheduler
          is needed. Disable this only if you trigger
          <code className="bg-muted mx-1 rounded px-1 py-0.5 text-[11px]">
            /api/cron/run
          </code>
          yourself (for example from a system crontab or Azure Function).
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Saving..." : "Save scheduling"}
        </Button>
      </div>

      <p className="text-muted-foreground text-xs">
        Last scheduled run: {cronLabel}
      </p>
    </form>
  );
}
