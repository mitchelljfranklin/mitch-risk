import * as React from "react";

const MOBILE_BREAKPOINT = 768;

function subscribeToViewportChanges(onChange: () => void) {
  const mediaQuery = window.matchMedia(
    `(max-width: ${MOBILE_BREAKPOINT - 1}px)`,
  );
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getIsMobileSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function getIsMobileServerSnapshot() {
  return false;
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribeToViewportChanges,
    getIsMobileSnapshot,
    getIsMobileServerSnapshot,
  );
}
