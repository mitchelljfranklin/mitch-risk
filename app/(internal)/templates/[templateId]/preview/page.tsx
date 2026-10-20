import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TemplatePreview } from "@/components/template-preview";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getTemplateForBuilder } from "@/lib/db/templates";

export const dynamic = "force-dynamic";

type PreviewPageProps = {
  params: Promise<{ templateId: string }>;
};

export async function generateMetadata({
  params,
}: PreviewPageProps): Promise<Metadata> {
  const { templateId } = await params;
  const template = await getTemplateForBuilder(templateId);
  if (!template) {
    const translations = await getTranslations("Templates.preview");
    return { title: translations("notFound") };
  }
  const translations = await getTranslations("Templates.preview");
  return {
    title: translations("title", { name: template.name }),
  };
}

export default async function TemplatePreviewPage({
  params,
}: PreviewPageProps) {
  await requirePermission(PERMISSIONS.TEMPLATES_VIEW);
  const translations = await getTranslations("Templates.preview");
  const builderTranslations = await getTranslations("Templates.builder");
  const { templateId } = await params;
  const template = await getTemplateForBuilder(templateId);
  if (!template) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          {
            label: builderTranslations("breadcrumbs.templates"),
            href: "/templates",
          },
          { label: template.name, href: `/templates/${templateId}` },
          { label: translations("breadcrumb") },
        ]}
      />
      <div>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          {template.name}
          <Badge variant="outline">v{template.version}</Badge>
        </h1>
        <p className="text-muted-foreground text-sm">
          {translations("description")}
        </p>
      </div>

      <TemplatePreview template={template} />
    </div>
  );
}
