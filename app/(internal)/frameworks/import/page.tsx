import { Breadcrumbs } from "@/components/breadcrumbs";
import { FrameworkImportForm } from "./import-form";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Frameworks.import");
  return { title: translations("metadataTitle") };
}

export default async function ImportFrameworkPage() {
  await requirePermission(PERMISSIONS.FRAMEWORKS_EDIT);
  const translations = await getTranslations("Frameworks.import");
  const listTranslations = await getTranslations("Frameworks.list");

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: listTranslations("title"), href: "/frameworks" },
          { label: translations("breadcrumb") },
        ]}
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {translations("title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {translations("subtitle")}
        </p>
      </div>
      <FrameworkImportForm />
    </div>
  );
}
