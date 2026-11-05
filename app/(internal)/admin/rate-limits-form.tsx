"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

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
  { name: "portalPageLoadsPerMin" },
  { name: "portalUploadsPerMin" },
  { name: "portalSubmitPerMin" },
  { name: "portalCommentPerMin" },
  { name: "portalPasswordAttemptsPerMin" },
  { name: "passwordResetPerMin" },
  { name: "breakGlassPerMin" },
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
  const translations = useTranslations("Admin.rateLimits");
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
            <Label htmlFor={field.name}>
              {translations(`fields.${field.name}.label`)}
            </Label>
            <p className="text-muted-foreground text-xs">
              {translations(`fields.${field.name}.help`)}
            </p>
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
          {isPending ? translations("saving") : translations("save")}
        </Button>
      </div>
    </form>
  );
}
