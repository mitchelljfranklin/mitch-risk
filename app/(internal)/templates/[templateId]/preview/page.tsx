import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
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
  if (!template) return { title: "Template not found" };
  return { title: `Preview — ${template.name}` };
}

export default async function TemplatePreviewPage({
  params,
}: PreviewPageProps) {
  await requirePermission(PERMISSIONS.TEMPLATES_VIEW);
  const { templateId } = await params;
  const template = await getTemplateForBuilder(templateId);
  if (!template) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href={`/templates/${templateId}`}
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Back to builder
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          {template.name}
          <Badge variant="outline">v{template.version}</Badge>
        </h1>
        <p className="text-muted-foreground text-sm">
          Read-only preview of how this questionnaire appears to a vendor.
          Conditional questions are all shown here with their rule noted.
        </p>
      </div>

      <TemplatePreview template={template} />
    </div>
  );
}
