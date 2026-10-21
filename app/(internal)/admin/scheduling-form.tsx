"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

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
  const translations = useTranslations("Admin.scheduling");
  const [state, action, isPending] = useActionState(
    saveSchedulingSettings,
    undefined,
  );
  useActionFeedback(state);

  const [reminderDays, setReminderDays] = useState<string>(
    reminderOffsetDays.join(", "),
  );

  const cronLabel = (() => {
    if (!cronLastRun) return translations("never");
    const then = new Date(cronLastRun);
    const diffMs = new Date().getTime() - then.getTime();
    if (diffMs < 0) return translations("justNow");
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return translations("lessThanMinute");
    if (minutes === 1) return translations("minuteAgo");
    if (minutes < 60) return translations("minutesAgo", { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return translations("hourAgo");
    if (hours < 24) return translations("hoursAgo", { count: hours });
    const days = Math.floor(hours / 24);
    if (days === 1) return translations("dayAgo");
    return translations("daysAgo", { count: days });
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
        <Label>{translations("reminderLabel")}</Label>
        <p className="text-muted-foreground text-xs">
          {translations("reminderHint")}
        </p>
        <Input
          value={reminderDays}
          onChange={(event) => setReminderDays(event.target.value)}
          placeholder={translations("reminderPlaceholder")}
          className="w-48"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="escalationDays">
          {translations("escalationLabel")}
        </Label>
        <p className="text-muted-foreground text-xs">
          {translations("escalationHint")}
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
        <Label htmlFor="defaultDueDays">
          {translations("defaultDueLabel")}
        </Label>
        <p className="text-muted-foreground text-xs">
          {translations("defaultDueHint")}
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
            {translations("schedulerLabel")}
          </Label>
        </div>
        <p className="text-muted-foreground text-xs">
          {translations("schedulerHint", { endpoint: "/api/cron/run" })}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? translations("saving") : translations("save")}
        </Button>
      </div>

      <p className="text-muted-foreground text-xs">
        {translations("lastRun", { when: cronLabel })}
      </p>
    </form>
  );
}
