"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useFormToast } from "@/hooks/use-form-toast";

type ActionState =
  { ok?: boolean; message?: string; error?: string } | undefined;

// Shows the action's toast and refreshes server data on success. Actions that
// feed a useActionState result MUST NOT call revalidatePath for the current
// route: in production builds that re-render races with the returned state and
// drops the toast / success effects. Instead they return the result and the
// client refreshes here, after the result has been applied.
export function useActionFeedback(state: ActionState) {
  useFormToast(state);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);
}
