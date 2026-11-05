"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PERMISSIONS, hasPermission, type Permission } from "@/lib/permissions";

type PaletteItem = {
  id: string;
  href: string;
  permission?: string;
};

type ResolvedPaletteItem = PaletteItem & {
  label: string;
  subtitle: string;
};

const ALL_ITEMS: PaletteItem[] = [
  { id: "dashboard", href: "/dashboard" },
  {
    id: "vendors",
    href: "/vendors",
    permission: PERMISSIONS.VENDORS_VIEW,
  },
  {
    id: "assessments",
    href: "/assessments",
    permission: PERMISSIONS.ASSESSMENTS_VIEW,
  },
  {
    id: "frameworks",
    href: "/frameworks",
    permission: PERMISSIONS.FRAMEWORKS_VIEW,
  },
  {
    id: "templates",
    href: "/templates",
    permission: PERMISSIONS.TEMPLATES_VIEW,
  },
  { id: "profile", href: "/profile" },
  {
    id: "adminGeneral",
    href: "/admin/general",
    permission: PERMISSIONS.SETTINGS_MANAGE,
  },
  {
    id: "adminUsers",
    href: "/admin/users",
    permission: PERMISSIONS.USERS_MANAGE,
  },
  {
    id: "adminRoles",
    href: "/admin/roles",
    permission: PERMISSIONS.ROLES_MANAGE,
  },
  {
    id: "adminApi",
    href: "/admin/api",
    permission: PERMISSIONS.API_MANAGE,
  },
  {
    id: "adminAudit",
    href: "/admin/audit",
    permission: PERMISSIONS.AUDIT_VIEW,
  },
  { id: "apiDocs", href: "/docs" },
];

function fuzzyMatch(item: ResolvedPaletteItem, query: string): boolean {
  const lower = query.toLowerCase();
  const tokens = lower.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const target = `${item.label} ${item.subtitle}`.toLowerCase();
  return tokens.every((token) => target.includes(token));
}

type CommandPaletteProps = {
  permissions: string[];
};

export function KeyboardShortcuts({ permissions }: CommandPaletteProps) {
  const translations = useTranslations("Shell.commandPalette");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const resolvedItems = useMemo(
    () =>
      ALL_ITEMS.map((item) => ({
        ...item,
        label: translations(`items.${item.id}.label`),
        subtitle: translations(`items.${item.id}.subtitle`),
      })),
    [translations],
  );

  const filteredItems = useMemo(() => {
    return resolvedItems.filter((item) => {
      if (
        item.permission &&
        !hasPermission(permissions, item.permission as Permission)
      ) {
        return false;
      }
      return fuzzyMatch(item, query);
    });
  }, [permissions, query, resolvedItems]);

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
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : close())}>
      <DialogContent
        aria-label={translations("label")}
        className="top-[15vh] max-w-lg translate-y-0 gap-0 p-0"
      >
        <DialogTitle className="sr-only">{translations("label")}</DialogTitle>
        <div className="border-b px-3 py-3">
          <Input
            ref={inputRef}
            type="text"
            placeholder={translations("searchPlaceholder")}
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
              {translations("noResults")}
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
              </button>
            ))
          )}
        </div>
        <div className="text-muted-foreground flex items-center justify-between border-t px-4 py-2 text-xs">
          <span>
            <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              ↑↓
            </kbd>{" "}
            {translations("navigate")} ·{" "}
            <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              ↵
            </kbd>{" "}
            {translations("open")} ·{" "}
            <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              esc
            </kbd>{" "}
            {translations("close")}
          </span>
          <span>
            <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              ⌘K
            </kbd>{" "}
            {translations("or")}{" "}
            <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              ?
            </kbd>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
