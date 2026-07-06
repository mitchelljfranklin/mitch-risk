import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

import { NewTemplateForm } from "./new-template-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "New template" };

export default async function NewTemplatePage() {
  await requirePermission(PERMISSIONS.TEMPLATES_CREATE);

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: "Templates", href: "/templates" },
          { label: "New" },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">New template</h1>
      <Card>
        <CardHeader>
          <CardTitle>Template details</CardTitle>
        </CardHeader>
        <CardContent>
          <NewTemplateForm />
        </CardContent>
      </Card>
    </div>
  );
}
