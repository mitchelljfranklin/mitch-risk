import type { Metadata } from "next";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

export const metadata: Metadata = { title: "API Documentation" };

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.API_MANAGE);
  return children;
}
