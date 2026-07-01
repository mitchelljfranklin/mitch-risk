"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSchedulingSettings } from "./actions";

type LimitsFormProps = {
  loginRateLimitPerMin: number;
  auditRetentionDays: number;
  emailLogRetentionDays: number;
  maxUploadMb: number;
  allowedExtensions: string[];
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

export function LimitsForm({
  loginRateLimitPerMin,
  auditRetentionDays,
  emailLogRetentionDays,
  maxUploadMb,
  allowedExtensions,
}: LimitsFormProps) {
  const [state, action, isPending] = useActionState(
    saveSchedulingSettings,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-6">
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
        <Label htmlFor="maxUploadMb">Maximum file upload size (MB)</Label>
        <p className="text-muted-foreground text-xs">
          Evidence files larger than this limit are rejected during upload.
        </p>
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
          {isPending ? "Saving..." : "Save limits"}
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
