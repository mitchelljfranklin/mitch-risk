import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listPublishedTemplates } from "@/lib/db/templates";
import { listUsers } from "@/lib/db/users";
import { getVendor } from "@/lib/db/vendors";

import { NewAssessmentForm } from "./new-assessment-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Assessments.new");
  return { title: translations("breadcrumb") };
}

type NewAssessmentPageProps = {
  params: Promise<{ vendorId: string }>;
};

export default async function NewAssessmentPage({
  params,
}: NewAssessmentPageProps) {
  await requirePermission(PERMISSIONS.ASSESSMENTS_CREATE);
  const translations = await getTranslations("Assessments.new");
  const shellTranslations = await getTranslations("Shell.workspace");
  const { vendorId } = await params;
  const vendor = await getVendor(vendorId);
  if (!vendor) {
    notFound();
  }

  const [templates, users] = await Promise.all([
    listPublishedTemplates(),
    listUsers(),
  ]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: shellTranslations("vendors"), href: "/vendors" },
          { label: vendor.name, href: `/vendors/${vendor.id}` },
          { label: translations("breadcrumb") },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">
        {translations("title", { vendorName: vendor.name })}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{translations("cardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <NewAssessmentForm
            vendorId={vendor.id}
            templates={templates.map((template) => ({
              id: template.id,
              label: `${template.name} v${template.version}`,
            }))}
            reviewers={users.map((user) => ({ id: user.id, label: user.name }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
