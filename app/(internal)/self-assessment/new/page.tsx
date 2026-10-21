import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listPublishedTemplates } from "@/lib/db/templates";
import { findOrCreateInternalVendor } from "@/lib/db/vendors";

import { NewSelfAssessmentForm } from "./new-self-assessment-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("SelfAssessment.new");
  return { title: translations("metaTitle") };
}

export default async function NewSelfAssessmentPage() {
  const user = await requirePermission(PERMISSIONS.ASSESSMENTS_CREATE);
  const translations = await getTranslations("SelfAssessment.new");
  const listTranslations = await getTranslations("SelfAssessment");

  const vendor = await findOrCreateInternalVendor(user.id, "My Organization");

  const templates = await listPublishedTemplates();

  if (templates.length === 0) {
    notFound();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          {
            label: listTranslations("title"),
            href: "/self-assessment",
          },
          { label: translations("breadcrumb") },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">
        {translations("title")}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{translations("cardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <NewSelfAssessmentForm
            vendorId={vendor.id}
            templates={templates.map((template) => ({
              id: template.id,
              label: `${template.name} v${template.version}`,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
