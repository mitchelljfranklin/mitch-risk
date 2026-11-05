import { requirePermission } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { PERMISSIONS } from "@/lib/permissions";
import { HealthTab } from "../health-tab";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Admin.health");
  return { title: translations("metaTitle") };
}

export default async function AdminHealthPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.health");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {translations("title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {translations("subtitle")}
        </p>
      </div>
      <HealthTab />
    </div>
  );
}
