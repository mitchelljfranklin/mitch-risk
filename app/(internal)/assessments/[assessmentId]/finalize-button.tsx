"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  type FinalizeState,
  finalizeWithStateAction,
} from "@/lib/actions/collaboration";

const initialState: FinalizeState = undefined;

export function FinalizeButton({ assessmentId }: { assessmentId: string }) {
  const translations = useTranslations("Assessments.detail.actions");
  const [state, formAction, isPending] = useActionState(
    finalizeWithStateAction,
    initialState,
  );
  useActionFeedback(state);

  return (
    <div className="flex items-start gap-2">
      <form action={formAction}>
        <input type="hidden" name="assessmentId" value={assessmentId} />
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? translations("finalizing") : translations("finalize")}
        </Button>
      </form>
      {state?.ok === false ? (
        <p className="text-destructive text-xs" role="alert">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
