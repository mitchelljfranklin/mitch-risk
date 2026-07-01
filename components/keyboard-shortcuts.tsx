"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const SHORTCUTS = [
  { keys: ["g", "d"], label: "Dashboard", href: "/dashboard" },
  { keys: ["g", "v"], label: "Vendors", href: "/vendors" },
  { keys: ["g", "a"], label: "Assessments", href: "/assessments" },
  { keys: ["g", "f"], label: "Frameworks", href: "/frameworks" },
  { keys: ["g", "t"], label: "Templates", href: "/templates" },
  { keys: ["g", "s"], label: "Settings", href: "/settings" },
] as const;

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const leaderRef = useRef<string | null>(null);
  const router = useRouter();

  const toggleOpen = useCallback(() => setOpen((prev) => !prev), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        toggleOpen();
        leaderRef.current = null;
        return;
      }

      if (e.key === "Escape") {
        close();
        leaderRef.current = null;
        return;
      }

      if (e.key === "g") {
        leaderRef.current = "g";
        return;
      }

      if (leaderRef.current === "g") {
        const shortcut = SHORTCUTS.find((s) => s.keys[1] === e.key);
        if (shortcut) {
          e.preventDefault();
          router.push(shortcut.href);
          leaderRef.current = null;
          close();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, toggleOpen, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={close}
    >
      <div
        className="bg-background w-full max-w-sm rounded-lg border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-muted-foreground flex items-center justify-between border-b px-4 py-3 text-xs">
          <span>Keyboard shortcuts</span>
          <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-[10px]">
            ?
          </kbd>
        </div>
        <div className="flex flex-col gap-1 p-2">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.href}
              className="flex items-center justify-between rounded px-3 py-2 text-sm"
            >
              <span>{shortcut.label}</span>
              <span className="text-muted-foreground flex gap-1 font-mono text-xs">
                <kbd className="bg-muted rounded px-1.5 py-0.5">
                  {shortcut.keys[0]}
                </kbd>
                <kbd className="bg-muted rounded px-1.5 py-0.5">
                  {shortcut.keys[1]}
                </kbd>
              </span>
            </div>
          ))}
        </div>
        <div className="text-muted-foreground border-t px-4 py-3 text-xs">
          Tip: Press{" "}
          <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-[10px]">
            ?
          </kbd>{" "}
          to toggle this dialog.
        </div>
      </div>
    </div>
  );
}
