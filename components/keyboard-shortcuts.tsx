"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { PERMISSIONS, hasPermission, type Permission } from "@/lib/permissions";

type PaletteItem = {
  label: string;
  subtitle?: string;
  href: string;
  permission?: string;
};

const ALL_ITEMS: PaletteItem[] = [
  { label: "Dashboard", subtitle: "Vendor risk overview", href: "/dashboard" },
  {
    label: "Vendors",
    subtitle: "Manage vendors",
    href: "/vendors",
    permission: PERMISSIONS.VENDORS_VIEW,
  },
  {
    label: "Assessments",
    subtitle: "Questionnaires",
    href: "/assessments",
    permission: PERMISSIONS.ASSESSMENTS_VIEW,
  },
  {
    label: "Frameworks",
    subtitle: "Compliance controls",
    href: "/frameworks",
    permission: PERMISSIONS.FRAMEWORKS_VIEW,
  },
  {
    label: "Templates",
    subtitle: "Questionnaire builder",
    href: "/templates",
    permission: PERMISSIONS.TEMPLATES_VIEW,
  },
  { label: "Profile", subtitle: "Your account", href: "/profile" },
  {
    label: "Settings · General",
    subtitle: "Organization",
    href: "/settings?tab=general",
    permission: PERMISSIONS.SETTINGS_MANAGE,
  },
  {
    label: "Settings · Users",
    subtitle: "Staff accounts",
    href: "/settings?tab=users",
    permission: PERMISSIONS.USERS_MANAGE,
  },
  {
    label: "Settings · Roles",
    subtitle: "Permissions",
    href: "/settings?tab=roles",
    permission: PERMISSIONS.ROLES_MANAGE,
  },
  {
    label: "Settings · API",
    subtitle: "API access",
    href: "/settings?tab=api",
    permission: PERMISSIONS.API_MANAGE,
  },
  {
    label: "Settings · Audit",
    subtitle: "Audit log",
    href: "/settings?tab=audit",
    permission: PERMISSIONS.AUDIT_VIEW,
  },
  { label: "API Docs", subtitle: "OpenAPI / Swagger", href: "/docs" },
];

function fuzzyMatch(item: PaletteItem, query: string): boolean {
  const lower = query.toLowerCase();
  const tokens = lower.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const target = `${item.label} ${item.subtitle ?? ""}`.toLowerCase();
  return tokens.every((token) => target.includes(token));
}

type CommandPaletteProps = {
  permissions: string[];
};

export function KeyboardShortcuts({ permissions }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filteredItems = useMemo(() => {
    return ALL_ITEMS.filter((item) => {
      if (
        item.permission &&
        !hasPermission(permissions, item.permission as Permission)
      ) {
        return false;
      }
      return fuzzyMatch(item, query);
    });
  }, [permissions, query]);

  const selectedItem = filteredItems[selectedIndex];
  const safeIndex = Math.max(
    0,
    Math.min(selectedIndex, filteredItems.length - 1),
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      close();
    },
    [router, close],
  );

  useEffect(() => {
    if (open) {
      // Defer focus + index reset to the next frame to avoid
      // synchronous setState cascading from the open gate.
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        setSelectedIndex(0);
      });
    }
  }, [open]);

  useEffect(() => {
    requestAnimationFrame(() => setSelectedIndex(0));
  }, [query, filteredItems.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isInput =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement;

      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      if (event.key === "?" && !isInput) {
        event.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      if (!open) return;

      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) =>
          Math.min(prev + 1, Math.max(0, filteredItems.length - 1)),
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        if (filteredItems[safeIndex]) {
          navigate(filteredItems[safeIndex].href);
        }
        return;
      }

      // Trap Tab inside the dialog.
      if (event.key === "Tab") {
        event.preventDefault();
        if (event.shiftKey) {
          inputRef.current?.focus();
        } else if (filteredItems.length > 0) {
          const el = document.getElementById(
            `command-item-${safeIndex}`,
          ) as HTMLElement | null;
          el?.focus();
        }
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close, navigate, filteredItems, safeIndex]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh]"
      onClick={close}
    >
      <div
        className="bg-background w-full max-w-lg rounded-lg border shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b px-3 py-3">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search pages..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="border-none shadow-none focus-visible:ring-0"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={
              filteredItems[safeIndex] ? `command-item-${safeIndex}` : undefined
            }
            aria-autocomplete="list"
          />
        </div>
        <div
          id="command-palette-list"
          role="listbox"
          className="max-h-64 overflow-y-auto p-1"
        >
          {filteredItems.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              No results.
            </p>
          ) : (
            filteredItems.map((item, index) => (
              <button
                key={item.href}
                id={`command-item-${index}`}
                type="button"
                role="option"
                aria-selected={index === safeIndex}
                onClick={() => navigate(item.href)}
                className={`flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm ${index === safeIndex ? "bg-accent text-accent-foreground" : ""}`}
              >
                <div className="flex flex-col">
                  <span>{item.label}</span>
                  {item.subtitle ? (
                    <span className="text-muted-foreground text-xs">
                      {item.subtitle}
                    </span>
                  ) : null}
                </div>
                {item.permission ? null : null}
              </button>
            ))
          )}
        </div>
        <div className="text-muted-foreground flex items-center justify-between border-t px-4 py-2 text-xs">
          <span>
            <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              ↑↓
            </kbd>{" "}
            navigate ·{" "}
            <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              ↵
            </kbd>{" "}
            open ·{" "}
            <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              esc
            </kbd>{" "}
            close
          </span>
          <span>
            <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              ⌘K
            </kbd>{" "}
            or{" "}
            <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              ?
            </kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
