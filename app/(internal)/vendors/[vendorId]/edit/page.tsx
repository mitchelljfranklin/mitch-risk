import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VendorForm } from "@/components/vendor-form";
import { updateVendorAction } from "@/lib/actions/vendors";
import { requireUser } from "@/lib/auth";
import { getVendor } from "@/lib/db/vendors";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit vendor" };

type EditVendorPageProps = {
  params: Promise<{ vendorId: string }>;
};

export default async function EditVendorPage({ params }: EditVendorPageProps) {
  await requireUser();
  const { vendorId } = await params;
  const vendor = await getVendor(vendorId);
  if (!vendor) {
    notFound();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit vendor</h1>
      <Card>
        <CardHeader>
          <CardTitle>Vendor details</CardTitle>
        </CardHeader>
        <CardContent>
          <VendorForm
            action={updateVendorAction}
            vendorId={vendor.id}
            defaults={{
              name: vendor.name,
              contactName: vendor.contactName ?? "",
              contactEmail: vendor.contactEmail,
              tier: vendor.tier ?? "",
              website: vendor.website ?? "",
              notes: vendor.notes ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
