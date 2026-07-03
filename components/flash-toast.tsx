"use client";

import { useEffect, useRef } from "react";

import { useToast } from "@/components/toast";

type FlashToastProps = {
  message: string;
  variant?: "success" | "error" | "info";
};

export function FlashToast({ message, variant = "success" }: FlashToastProps) {
  const { toast } = useToast();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    toast(message, variant);
  }, [message, variant, toast]);

  return null;
}
