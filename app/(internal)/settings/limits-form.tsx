"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveLimitsSettings } from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type LimitsFormProps = {
  loginRateLimitPerMin: number;
  sessionTimeoutMinutes: number;
  auditRetentionDays: number;
  emailLogRetentionDays: number;
  maxUploadMb: number;
  allowedExtensions: string[];
  portalPageLoadsPerMin: number;
  portalUploadsPerMin: number;
  portalSubmitPerMin: number;
  portalCommentPerMin: number;
  portalPasswordAttemptsPerMin: number;
  passwordResetPerMin: number;
  breakGlassPerMin: number;
};

const RATE_LIMIT_FIELDS = [
  {
    name: "portalPageLoadsPerMin",
    label: "Portal page loads / min (per visitor)",
    help: "How often a vendor's browser can load the vendor link. Guards against link-enumeration.",
  },
  {
    name: "portalUploadsPerMin",
    label: "Portal evidence uploads / min (per visitor)",
    help: "Maximum evidence file uploads a vendor can make per minute.",
  },
  {
    name: "portalSubmitPerMin",
    label: "Portal submissions / min (per link)",
    help: "Maximum submit attempts for a single vendor link.",
  },
  {
    name: "portalCommentPerMin",
    label: "Portal comments / min (per link)",
    help: "Maximum comments a vendor can post on a single vendor link.",
  },
  {
    name: "portalPasswordAttemptsPerMin",
    label: "Portal password attempts / min (per link)",
    help: "Guards a password-protected questionnaire against brute-force.",
  },
  {
    name: "passwordResetPerMin",
    label: "Password reset requests / min (per email)",
    help: "Limits staff password-reset emails for a given address.",
  },
  {
    name: "breakGlassPerMin",
    label: "Break-glass attempts / min (per IP)",
    help: "Limits validation of the SSO break-glass recovery link.",
  },
] as const;

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
  sessionTimeoutMinutes,
  auditRetentionDays,
  emailLogRetentionDays,
  maxUploadMb,
  allowedExtensions,
  portalPageLoadsPerMin,
  portalUploadsPerMin,
  portalSubmitPerMin,
  portalCommentPerMin,
  portalPasswordAttemptsPerMin,
  passwordResetPerMin,
  breakGlassPerMin,
}: LimitsFormProps) {
  const [state, action, isPending] = useActionState(
    saveLimitsSettings,
    undefined,
  );
  useActionFeedback(state);

  const rateLimitValues: Record<string, number> = {
    portalPageLoadsPerMin,
    portalUploadsPerMin,
    portalSubmitPerMin,
    portalCommentPerMin,
    portalPasswordAttemptsPerMin,
    passwordResetPerMin,
    breakGlassPerMin,
  };

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
        <Label htmlFor="sessionTimeoutMinutes">Auto-logout (minutes)</Label>
        <p className="text-muted-foreground text-xs">
          Automatically sign out after this many minutes of inactivity. Set to 0
          to disable. Minimum 5 minutes when enabled.
        </p>
        <Input
          id="sessionTimeoutMinutes"
          name="sessionTimeoutMinutes"
          type="number"
          min={0}
          defaultValue={sessionTimeoutMinutes}
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
                  key={`${ext}-${checked}`}
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

      <div className="flex flex-col gap-4 border-t pt-4">
        <div>
          <h3 className="text-sm font-medium">Rate limits (per minute)</h3>
          <p className="text-muted-foreground text-xs">
            Abuse protection for the public vendor portal and account recovery.
            Raise these for busy vendors or shared-office IPs; the defaults suit
            most deployments.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {RATE_LIMIT_FIELDS.map((field) => (
            <div key={field.name} className="flex flex-col gap-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <p className="text-muted-foreground text-xs">{field.help}</p>
              <Input
                id={field.name}
                name={field.name}
                type="number"
                min={1}
                defaultValue={rateLimitValues[field.name]}
                className="w-32"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Saving..." : "Save limits"}
        </Button>
      </div>
    </form>
  );
}
