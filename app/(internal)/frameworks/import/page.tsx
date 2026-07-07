import { Breadcrumbs } from "@/components/breadcrumbs";
import { FrameworkImportForm } from "./import-form";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Import framework" };

export default async function ImportFrameworkPage() {
  await requirePermission(PERMISSIONS.FRAMEWORKS_EDIT);

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: "Frameworks", href: "/frameworks" },
          { label: "Import" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Import framework
        </h1>
        <p className="text-muted-foreground text-sm">
          Upload a CSV file with controls to create a new framework.
        </p>
      </div>
      <FrameworkImportForm />
    </div>
  );
}
