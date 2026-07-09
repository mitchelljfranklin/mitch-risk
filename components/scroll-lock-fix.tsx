"use client";

import { useEffect } from "react";

export function ScrollLockFix() {
  useEffect(() => {
    const observer = new MutationObserver(() => {
      document.body.style.removeProperty("overflow");
      document.body.style.removeProperty("pointer-events");
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    });
    return () => observer.disconnect();
  }, []);
  return null;
}
