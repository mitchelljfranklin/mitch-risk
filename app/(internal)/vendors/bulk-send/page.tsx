import { Breadcrumbs } from "@/components/breadcrumbs";

import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listPublishedTemplates } from "@/lib/db/templates";
import { listAllVendorsBasic } from "@/lib/db/vendors";
import { listUsersFull } from "@/lib/db/users";

import { BulkSendForm } from "./bulk-send-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("BulkSend");
  return { title: translations("metaTitle") };
}

export default async function BulkSendPage() {
  await requirePermission(PERMISSIONS.ASSESSMENTS_CREATE);
  const translations = await getTranslations("BulkSend");
  const shellTranslations = await getTranslations("Shell.workspace");

  const [vendors, templates, users] = await Promise.all([
    listAllVendorsBasic(),
    listPublishedTemplates(),
    listUsersFull(),
  ]);

  const reviewers = users.map((user) => ({ id: user.id, label: user.name }));
  const templateOptions = templates.map((template) => ({
    id: template.id,
    label: `${template.name} v${template.version}`,
  }));

  return (
    <div className="flex flex-col gap-6">
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

      <BulkSendForm
        vendors={vendors.map((vendor) => ({
          id: vendor.id,
          name: vendor.name,
          contactEmail: vendor.contactEmail,
          tier: vendor.tier,
        }))}
        templates={templateOptions}
        reviewers={reviewers}
      />
    </div>
  );
}
