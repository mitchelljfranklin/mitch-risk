import { Breadcrumbs } from "@/components/breadcrumbs";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listPublishedTemplates } from "@/lib/db/templates";
import { listAllVendorsBasic } from "@/lib/db/vendors";
import { listUsersFull } from "@/lib/db/users";

import { BulkSendForm } from "./bulk-send-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Bulk send" };

export default async function BulkSendPage() {
  await requirePermission(PERMISSIONS.ASSESSMENTS_CREATE);

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
          { label: "Vendors", href: "/vendors" },
          { label: "Bulk send" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bulk send</h1>
        <p className="text-muted-foreground text-sm">
          Send the same questionnaire to multiple vendors at once.
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
