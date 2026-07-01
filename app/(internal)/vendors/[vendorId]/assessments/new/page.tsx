import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { listPublishedTemplates } from "@/lib/db/templates";
import { listUsers } from "@/lib/db/users";
import { getVendor } from "@/lib/db/vendors";

import { NewAssessmentForm } from "./new-assessment-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "New assessment" };

type NewAssessmentPageProps = {
  params: Promise<{ vendorId: string }>;
};

export default async function NewAssessmentPage({
  params,
}: NewAssessmentPageProps) {
  await requireUser();
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
      <h1 className="text-2xl font-semibold tracking-tight">
        New assessment for {vendor.name}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Assessment details</CardTitle>
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
