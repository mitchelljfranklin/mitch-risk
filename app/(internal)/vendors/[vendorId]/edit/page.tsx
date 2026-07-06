import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VendorForm } from "@/components/vendor-form";
import { updateVendorAction } from "@/lib/actions/vendors";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getVendor } from "@/lib/db/vendors";
import { listUsers } from "@/lib/db/users";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit vendor" };

type EditVendorPageProps = {
  params: Promise<{ vendorId: string }>;
};

export default async function EditVendorPage({ params }: EditVendorPageProps) {
  await requirePermission(PERMISSIONS.VENDORS_EDIT);
  const { vendorId } = await params;
  const [vendor, owners] = await Promise.all([
    getVendor(vendorId),
    listUsers(),
  ]);
  if (!vendor) {
    notFound();
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: "Vendors", href: "/vendors" },
          { label: vendor.name, href: `/vendors/${vendor.id}` },
          { label: "Edit" },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">Edit vendor</h1>
      <Card>
        <CardHeader>
          <CardTitle>Vendor details</CardTitle>
          <CardDescription>Update vendor details.</CardDescription>
        </CardHeader>
        <CardContent>
          <VendorForm
            action={updateVendorAction}
            vendorId={vendor.id}
            owners={owners}
            defaults={{
              name: vendor.name,
              contactName: vendor.contactName ?? "",
              contactEmail: vendor.contactEmail,
              tier: vendor.tier ?? "",
              website: vendor.website ?? "",
              notes: vendor.notes ?? "",
              serviceDescription: vendor.serviceDescription ?? "",
              dataSensitivity: vendor.dataSensitivity ?? "",
              contractRenewalDate: vendor.contractRenewalDate
                ? vendor.contractRenewalDate.toISOString().slice(0, 10)
                : "",
              ownerId: vendor.ownerId ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
