import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { ImportVendorsForm } from "./import-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Import vendors" };

export default async function ImportVendorsPage() {
  await requirePermission(PERMISSIONS.VENDORS_CREATE);

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Breadcrumbs
        segments={[{ label: "Vendors", href: "/vendors" }, { label: "Import" }]}
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Import vendors
        </h1>
        <p className="text-muted-foreground text-sm">
          Upload a CSV file to bulk-create vendors.
        </p>
      </div>
      <ImportVendorsForm />
    </div>
  );
}
