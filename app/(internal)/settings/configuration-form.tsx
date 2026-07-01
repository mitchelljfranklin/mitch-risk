"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSchedulingSettings } from "./actions";

type ConfigurationProps = {
  reminderOffsetDays: number[];
  escalationAfterDays: number;
  defaultDueInDays: number;
  auditRetentionDays: number;
  emailLogRetentionDays: number;
  maxUploadMb: number;
  allowedExtensions: string[];
  loginRateLimitPerMin: number;
};

const ALL_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "docx",
  "xlsx",
  "csv",
  "txt",
  "zip",
  "pptx",
];

export function ConfigurationForm({
  reminderOffsetDays,
  escalationAfterDays,
  defaultDueInDays,
  auditRetentionDays,
  emailLogRetentionDays,
  maxUploadMb,
  allowedExtensions,
  loginRateLimitPerMin,
}: ConfigurationProps) {
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
        <Label htmlFor="loginRateLimit">Login rate limit (per minute)</Label>
        <p className="text-muted-foreground text-xs">
          Maximum sign-in attempts per IP address per minute. Increase for
          shared-office environments behind a single public IP.
        </p>
        <Input
          id="loginRateLimit"
          name="loginRateLimit"
          type="number"
          min={1}
          defaultValue={loginRateLimitPerMin}
          className="w-32"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="auditRetention">Audit log retention (days)</Label>
        <p className="text-muted-foreground text-xs">
          Audit entries older than this many days are automatically pruned by
          the cron job. Set to 0 to keep indefinitely.
        </p>
        <Input
          id="auditRetention"
          name="auditRetention"
          type="number"
          min={0}
          defaultValue={auditRetentionDays}
          className="w-32"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="emailLogRetention">Email log retention (days)</Label>
        <p className="text-muted-foreground text-xs">
          Email send records older than this many days are automatically pruned
          by the cron job. Set to 0 to keep indefinitely.
        </p>
        <Input
          id="emailLogRetention"
          name="emailLogRetention"
          type="number"
          min={0}
          defaultValue={emailLogRetentionDays}
          className="w-32"
        />
      </div>

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

      <div className="flex flex-col gap-2">
        <Label htmlFor="maxUploadMb">Maximum file upload size (MB)</Label>
        <Input
          id="maxUploadMb"
          name="maxUploadMb"
          type="number"
          min={1}
          defaultValue={maxUploadMb}
          className="w-32"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Allowed file extensions</Label>
        <p className="text-muted-foreground text-xs">
          File types vendors can upload as evidence. Select at least one.
        </p>
        <div className="flex flex-wrap gap-3">
          {ALL_EXTENSIONS.map((ext) => {
            const checked = allowedExtensions.includes(ext);
            return (
              <label key={ext} className="flex items-center gap-2 text-sm">
                <Checkbox
                  name="allowedExtensions"
                  value={ext}
                  defaultChecked={checked}
                />
                .{ext}
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Saving..." : "Save configuration"}
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
