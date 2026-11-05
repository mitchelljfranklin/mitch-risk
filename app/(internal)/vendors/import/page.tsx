import { Breadcrumbs } from "@/components/breadcrumbs";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { ImportVendorsForm } from "./import-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("VendorImport");
  return { title: translations("metaTitle") };
}

export default async function ImportVendorsPage() {
  await requirePermission(PERMISSIONS.VENDORS_CREATE);
  const translations = await getTranslations("VendorImport");
  const shellTranslations = await getTranslations("Shell.workspace");

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: shellTranslations("vendors"), href: "/vendors" },
          { label: translations("breadcrumb") },
        ]}
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {translations("title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {translations("subtitle")}
        </p>
      </div>
      <ImportVendorsForm />
    </div>
  );
}
