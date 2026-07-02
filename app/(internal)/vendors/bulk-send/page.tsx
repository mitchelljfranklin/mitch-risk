import Link from "next/link";

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

  const reviewers = users.map((u) => ({ id: u.id, label: u.name }));
  const templateOptions = templates.map((t) => ({
    id: t.id,
    label: `${t.name} v${t.version}`,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/vendors"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Vendors
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Bulk send</h1>
        <p className="text-muted-foreground text-sm">
          Send the same questionnaire to multiple vendors at once.
        </p>
      </div>

      <BulkSendForm
        vendors={vendors.map((v) => ({
          id: v.id,
          name: v.name,
          contactEmail: v.contactEmail,
          tier: v.tier,
        }))}
        templates={templateOptions}
        reviewers={reviewers}
      />
    </div>
  );
}
