"use client";

import { useEffect } from "react";

export function ScrollLockFix() {
  useEffect(() => {
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("pointer-events");
  }, []);
  return null;
}
