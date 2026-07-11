import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listPublishedTemplates } from "@/lib/db/templates";
import { prisma } from "@/lib/prisma";

import { NewSelfAssessmentForm } from "./new-self-assessment-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "New self-assessment" };

const INTERNAL_VENDOR_NAME = "My Organization";

export default async function NewSelfAssessmentPage() {
  await requirePermission(PERMISSIONS.ASSESSMENTS_CREATE);

  let vendor = await prisma.vendor.findFirst({
    where: { name: INTERNAL_VENDOR_NAME },
  });

  if (!vendor) {
    vendor = await prisma.vendor.create({
      data: {
        name: INTERNAL_VENDOR_NAME,
        contactEmail: "internal@local",
        tier: null,
      },
    });
  }

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
