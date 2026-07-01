import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";

import { NewTemplateForm } from "./new-template-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "New template" };

export default async function NewTemplatePage() {
  await requireUser();

  return (
    <div className="flex max-w-lg flex-col gap-6">
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
