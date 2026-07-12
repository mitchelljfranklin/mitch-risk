"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useFormToast } from "@/hooks/use-form-toast";

type ActionState =
  { ok?: boolean; message?: string; error?: string } | undefined;

// Shows the action's toast and refreshes server data on success. Actions that
// feed a useActionState result should prefer to let this hook handle the
// refresh rather than calling revalidatePath for the current route — doing both
// causes a redundant double-refresh. Sonner toasts render via portal and
// survive route refetches, so the double-refresh is harmless, just wasteful.
// When an action is also called from non-useActionState contexts (API routes,
// cron), calling revalidatePath in the action is fine.
export function useActionFeedback(state: ActionState) {
  useFormToast(state);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);
}
