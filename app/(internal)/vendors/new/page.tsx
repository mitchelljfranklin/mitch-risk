import type { Metadata } from "next";
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
import { createVendorAction } from "@/lib/actions/vendors";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listUsers } from "@/lib/db/users";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations("Vendors");
  return { title: translations("new.title") };
}

export default async function NewVendorPage() {
  await requirePermission(PERMISSIONS.VENDORS_CREATE);
  const owners = await listUsers();
  const translations = await getTranslations("Vendors");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: translations("title"), href: "/vendors" },
          { label: translations("new.breadcrumb") },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">
        {translations("new.title")}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{translations("new.cardTitle")}</CardTitle>
          <CardDescription>
            {translations("new.cardDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VendorForm action={createVendorAction} owners={owners} />
        </CardContent>
      </Card>
    </div>
  );
}
