import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VendorForm } from "@/components/vendor-form";
import { createVendorAction } from "@/lib/actions/vendors";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata = { title: "New vendor" };

export default async function NewVendorPage() {
  await requirePermission(PERMISSIONS.VENDORS_CREATE);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">New vendor</h1>
      <Card>
        <CardHeader>
          <CardTitle>Vendor details</CardTitle>
        </CardHeader>
        <CardContent>
          <VendorForm action={createVendorAction} />
        </CardContent>
      </Card>
    </div>
  );
}
