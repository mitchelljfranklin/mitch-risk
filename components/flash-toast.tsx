"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

type FlashToastProps = {
  message: string;
  variant?: "success" | "error" | "info";
};

export function FlashToast({ message, variant = "success" }: FlashToastProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (variant === "error") {
      toast.error(message);
    } else if (variant === "info") {
      toast(message, { icon: undefined });
    } else {
      toast.success(message);
    }
  }, [message, variant]);

  return null;
}
