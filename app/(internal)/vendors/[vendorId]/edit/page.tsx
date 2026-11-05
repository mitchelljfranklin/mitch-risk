import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

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
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations("Vendors");
  return { title: translations("edit.title") };
}

type EditVendorPageProps = {
  params: Promise<{ vendorId: string }>;
};

export default async function EditVendorPage({ params }: EditVendorPageProps) {
  await requirePermission(PERMISSIONS.VENDORS_EDIT);
  const { vendorId } = await params;
  const [vendor, owners, attachmentRows] = await Promise.all([
    getVendor(vendorId),
    listUsers(),
    prisma.attachment.findMany({
      where: { entityType: "Vendor", entityId: vendorId },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!vendor) {
    notFound();
  }

  const attachments = attachmentRows.map((attachment) => ({
    id: attachment.id,
    fileName: attachment.fileName,
    displayName: attachment.displayName,
    sizeBytes: attachment.sizeBytes,
    createdAt: attachment.createdAt.toISOString(),
  }));
  const translations = await getTranslations("Vendors");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: translations("title"), href: "/vendors" },
          { label: vendor.name, href: `/vendors/${vendor.id}` },
          { label: translations("edit.breadcrumb") },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">
        {translations("edit.title")}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{translations("edit.cardTitle")}</CardTitle>
          <CardDescription>
            {translations("edit.cardDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VendorForm
            action={updateVendorAction}
            vendorId={vendor.id}
            owners={owners}
            attachments={attachments}
            defaults={{
              name: vendor.name,
              externalId: vendor.externalId ?? "",
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
              contractValue: vendor.contractValue ?? "",
              geographicRisk: vendor.geographicRisk ?? "",
              tags: vendor.tags?.join(", ") ?? "",
              ownerId: vendor.ownerId ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
