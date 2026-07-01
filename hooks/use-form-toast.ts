"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/toast";

type ActionState =
  { ok?: boolean; message?: string; error?: string } | undefined;

export function useFormToast(state: ActionState) {
  const { toast } = useToast();
  const prevRef = useRef(state);

  useEffect(() => {
    if (!state || state === prevRef.current) return;

    const message = state.message ?? state.error;
    const isSuccess = state.ok ?? false;

    if (message) {
      toast(message, isSuccess ? "success" : "error");
    }
    prevRef.current = state;
  }, [state, toast]);
}
