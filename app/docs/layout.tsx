import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations("ApiDocs");
  return { title: translations("metaTitle") };
}

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.API_MANAGE);
  return children;
}
