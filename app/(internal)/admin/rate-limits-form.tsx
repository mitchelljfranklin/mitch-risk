"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveRateLimitSettings } from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type RateLimitsFormProps = {
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

export function RateLimitsForm({
  portalPageLoadsPerMin,
  portalUploadsPerMin,
  portalSubmitPerMin,
  portalCommentPerMin,
  portalPasswordAttemptsPerMin,
  passwordResetPerMin,
  breakGlassPerMin,
}: RateLimitsFormProps) {
  const [state, action, isPending] = useActionState(
    saveRateLimitSettings,
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

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Saving..." : "Save rate limits"}
        </Button>
      </div>
    </form>
  );
}
