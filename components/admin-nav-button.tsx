"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

// Header entry point into the admin area. Rendered only when the user holds
// at least one admin permission (the server layout gates it); the icon
// highlights while anywhere under /admin.
export function AdminNavButton() {
  const pathname = usePathname();
  const isActive = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <Button
      variant="outline"
      size="icon"
      type="button"
      asChild
      aria-label="Admin"
    >
      <Link
        href="/admin"
        className={isActive ? "border-primary text-primary" : undefined}
      >
        <Settings className="size-4" />
        <span className="sr-only">Admin</span>
      </Link>
    </Button>
  );
}
