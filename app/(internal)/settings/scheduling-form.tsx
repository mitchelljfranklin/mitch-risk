"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSchedulingSettings } from "./actions";

type SchedulingFormProps = {
  reminderOffsetDays: number[];
  escalationAfterDays: number;
  defaultDueInDays: number;
};

export function SchedulingForm({
  reminderOffsetDays,
  escalationAfterDays,
  defaultDueInDays,
}: SchedulingFormProps) {
  const [state, action, isPending] = useActionState(
    saveSchedulingSettings,
    undefined,
  );

  const [reminderDays, setReminderDays] = useState<string>(
    reminderOffsetDays.join(", "),
  );

  return (
    <form action={action} className="flex flex-col gap-6">
      <input
        type="hidden"
        name="reminderDays"
        value={reminderDays
          .split(",")
          .map((d) => d.trim())
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
          onChange={(e) => setReminderDays(e.target.value)}
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

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Saving..." : "Save scheduling"}
        </Button>
        {state?.message ? (
          <p
            className={`text-sm ${state.ok ? "text-green-600" : "text-destructive"}`}
            role="alert"
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
