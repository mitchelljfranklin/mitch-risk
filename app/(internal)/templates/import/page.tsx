import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { ImportTemplateForm } from "./import-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Import template" };

export default async function ImportTemplatePage() {
  await requirePermission(PERMISSIONS.TEMPLATES_CREATE);

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: "Templates", href: "/templates" },
          { label: "Import" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Import template
        </h1>
        <p className="text-muted-foreground text-sm">
          Upload a JSON file to create a new template.
        </p>
      </div>
      <ImportTemplateForm />
    </div>
  );
}
