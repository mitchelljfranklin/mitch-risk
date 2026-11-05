import { Breadcrumbs } from "@/components/breadcrumbs";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getTranslations } from "next-intl/server";
import { ImportTemplateForm } from "./import-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Templates.import");
  return { title: translations("metadataTitle") };
}

export default async function ImportTemplatePage() {
  await requirePermission(PERMISSIONS.TEMPLATES_CREATE);
  const translations = await getTranslations("Templates.import");
  const builderTranslations = await getTranslations("Templates.builder");

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          {
            label: builderTranslations("breadcrumbs.templates"),
            href: "/templates",
          },
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
      <ImportTemplateForm />
    </div>
  );
}
