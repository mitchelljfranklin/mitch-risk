"use client";

import { useEffect, useRef, useState } from "react";

import { signOutAction } from "@/lib/actions/auth";

type IdleTimerProps = {
  timeoutMinutes: number;
};

const COUNTDOWN_SECONDS = 60;

export function IdleTimer({ timeoutMinutes }: IdleTimerProps) {
  const [countdown, setCountdown] = useState(0);
  const lastActivityRef = useRef<number | null>(null);
  const countdownRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize last activity time on mount
  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Reset when timeout changes
  useEffect(() => {
    if (timeoutMinutes <= 0) return;

    function onActivity() {
      lastActivityRef.current = Date.now();
      if (countdownRef.current > 0) {
        setCountdown(0);
        countdownRef.current = 0;
      }
    }

    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("click", onActivity);
    window.addEventListener("scroll", onActivity);
    window.addEventListener("touchstart", onActivity);

    const interval = setInterval(() => {
      if (countdownRef.current > 0) return;

      const idleMs = Date.now() - (lastActivityRef.current ?? Date.now());
      const timeoutMs = timeoutMinutes * 60 * 1000;

      if (idleMs >= timeoutMs) {
        countdownRef.current = COUNTDOWN_SECONDS;
        setCountdown(COUNTDOWN_SECONDS);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("click", onActivity);
      window.removeEventListener("scroll", onActivity);
      window.removeEventListener("touchstart", onActivity);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [timeoutMinutes]);

  // Countdown tick
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setTimeout(() => {
      const next = countdown - 1;
      countdownRef.current = next;
      setCountdown(next);

      if (next <= 0) {
        signOutAction();
      }
    }, 1000);

    timeoutRef.current = timer;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  if (timeoutMinutes <= 0 || countdown <= 0) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Session expiring"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="bg-background w-full max-w-sm rounded-lg border p-6 text-center shadow-xl">
        <p className="text-lg font-semibold">Session expiring</p>
        <p className="text-muted-foreground mt-2 text-sm" aria-live="assertive">
          You will be signed out in {countdown} second
          {countdown !== 1 ? "s" : ""} due to inactivity. Move your mouse or
          press any key to stay signed in.
        </p>
      </div>
    </div>
  );
}
