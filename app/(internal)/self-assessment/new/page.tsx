import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listPublishedTemplates } from "@/lib/db/templates";
import { findOrCreateInternalVendor } from "@/lib/db/vendors";

import { NewSelfAssessmentForm } from "./new-self-assessment-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "New self-assessment" };

export default async function NewSelfAssessmentPage() {
  const user = await requirePermission(PERMISSIONS.ASSESSMENTS_CREATE);

  const vendor = await findOrCreateInternalVendor(user.id, "My Organization");

  const templates = await listPublishedTemplates();

  if (templates.length === 0) {
    notFound();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: "Self-assessment", href: "/self-assessment" },
          { label: "New" },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">
        New self-assessment
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Assessment details</CardTitle>
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
