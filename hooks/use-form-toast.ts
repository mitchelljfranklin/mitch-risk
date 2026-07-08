"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

type ActionState =
  { ok?: boolean; message?: string; error?: string } | undefined;

export function useFormToast(state: ActionState) {
  const prevRef = useRef(state);

  useEffect(() => {
    if (!state || state === prevRef.current) return;

    const message = state.message ?? state.error;
    const isSuccess = state.ok ?? false;

    if (message) {
      if (isSuccess) {
        toast.success(message);
      } else {
        toast.error(message);
      }
    }
    prevRef.current = state;
  }, [state]);
}
