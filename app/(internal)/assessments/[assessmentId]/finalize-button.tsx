"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  type FinalizeState,
  finalizeWithStateAction,
} from "@/lib/actions/collaboration";

const initialState: FinalizeState = undefined;

export function FinalizeButton({ assessmentId }: { assessmentId: string }) {
  const [state, formAction, isPending] = useActionState(
    finalizeWithStateAction,
    initialState,
  );

  return (
    <div className="flex items-start gap-2">
      <form action={formAction}>
        <input type="hidden" name="assessmentId" value={assessmentId} />
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Finalizing…" : "Finalize"}
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
