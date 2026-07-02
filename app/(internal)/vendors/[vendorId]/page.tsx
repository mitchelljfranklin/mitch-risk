import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteVendorAction } from "@/lib/actions/vendors";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getVendorProfile } from "@/lib/db/compliance";
import { listFrameworks } from "@/lib/db/frameworks";
import { getVendor } from "@/lib/db/vendors";
import { ASSESSMENT_STATUS_LABELS } from "@/lib/schemas/assessment";
import { VENDOR_TIER_LABELS } from "@/lib/schemas/vendor";
import { formatDate, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

type VendorDetailPageProps = {
  params: Promise<{ vendorId: string }>;
};

export async function generateMetadata({
  params,
}: VendorDetailPageProps): Promise<Metadata> {
  const { vendorId } = await params;
  const vendor = await getVendor(vendorId);
  if (!vendor) return { title: "Vendor not found" };
  return { title: vendor.name };
}

export default async function VendorDetailPage({
  params,
}: VendorDetailPageProps) {
  const user = await requirePermission(PERMISSIONS.VENDORS_VIEW);
  const canEditVendor = hasPermission(
    user.permissions,
    PERMISSIONS.VENDORS_EDIT,
  );
  const canDeleteVendor = hasPermission(
    user.permissions,
    PERMISSIONS.VENDORS_DELETE,
  );
  const canCreateAssessment = hasPermission(
    user.permissions,
    PERMISSIONS.ASSESSMENTS_CREATE,
  );
  const { vendorId } = await params;
  const vendor = await getVendor(vendorId);
  if (!vendor) {
    notFound();
  }

  const [profile, frameworks] = await Promise.all([
    getVendorProfile(vendorId),
    listFrameworks(),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: "Vendors", href: "/vendors" },
          { label: vendor.name },
        ]}
      />
      <div>
        <Link
          href="/vendors"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Vendors
        </Link>
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {vendor.name}
            {vendor.tier ? (
              <Badge variant="outline">{VENDOR_TIER_LABELS[vendor.tier]}</Badge>
            ) : null}
          </h1>
          <div className="flex items-center gap-2">
            {canEditVendor ? (
              <Button asChild variant="outline">
                <Link href={`/vendors/${vendor.id}/edit`}>Edit</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm">
              <a href={`/api/v1/vendors/${vendor.id}/export`} download>
                Export CSV
              </a>
            </Button>
            {canDeleteVendor ? (
              <form
                id={`delete-vendor-${vendor.id}`}
                action={deleteVendorAction}
              >
                <input type="hidden" name="vendorId" value={vendor.id} />
                <ConfirmDialog
                  title="Delete vendor?"
                  description={`This will permanently delete ${vendor.name} and all ${vendor.assessments.length} assessment(s). This action cannot be undone.`}
                  formId={`delete-vendor-${vendor.id}`}
                >
                  <Button type="button" variant="outline">
                    Delete
                  </Button>
                </ConfirmDialog>
              </form>
            ) : null}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            {vendor.contactName ? `${vendor.contactName} · ` : ""}
            {vendor.contactEmail}
          </span>
          {vendor.overallScore !== null ? (
            <span className="font-semibold">
              Score {formatPercent(vendor.overallScore)}
            </span>
          ) : null}
        </div>
      </div>

      {profile ? (
        <Card>
          <CardHeader>
            <CardTitle>Risk profile</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {profile.overallScore !== null ? (
              <p className="text-2xl font-semibold">
                {formatPercent(profile.overallScore)} overall
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                No score yet — submit an assessment.
              </p>
            )}
            {profile.history.length > 0 ? (
              <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-xs font-medium">
                  Trend
                </span>
                <div
                  className="flex items-end gap-1"
                  style={{ height: "60px" }}
                >
                  {profile.history
                    .slice(0, 8)
                    .reverse()
                    .map((item) => {
                      const ratio = item.score ?? 0;
                      const height = Math.max(4, Math.round(ratio * 56));
                      return (
                        <div
                          key={item.id}
                          className="flex flex-1 flex-col items-center gap-1"
                          title={`${item.title}: ${item.score !== null ? formatPercent(item.score) : "—"}`}
                        >
                          <span className="text-muted-foreground text-[10px]">
                            {item.score !== null
                              ? formatPercent(item.score)
                              : "—"}
                          </span>
                          <div
                            className={`w-full rounded-sm ${ratio >= 0.85 ? "bg-[var(--rag-green)]" : ratio >= 0.6 ? "bg-[var(--rag-amber)]" : "bg-[var(--rag-red)]"} ${ratio === 0 ? "bg-muted" : ""}`}
                            style={{ height: `${height}px` }}
                          />
                        </div>
                      );
                    })}
                </div>
                {profile.history.length > 1 ? (
                  <Link
                    href={`/vendors/${vendor.id}/compare?left=${profile.history[1]?.id}&right=${profile.history[0]?.id}`}
                    className="text-muted-foreground text-xs hover:underline"
                  >
                    Compare last two →
                  </Link>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {profile && profile.domainBreakdown.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Domain compliance</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {profile.domainBreakdown.map((item) => {
              const ratioPercent = Math.round(item.complianceRatio * 100);
              return (
                <div key={item.domain} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.domain}</span>
                    <span className="text-muted-foreground">
                      {ratioPercent}%
                    </span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className={`h-full rounded-full ${ratioPercent >= 85 ? "bg-[var(--rag-green)]" : ratioPercent >= 60 ? "bg-[var(--rag-amber)]" : "bg-[var(--rag-red)]"}`}
                      style={{ width: `${ratioPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {frameworks.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Framework heatmaps</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {frameworks.map((framework) => (
              <Link
                key={framework.id}
                href={`/vendors/${vendor.id}/frameworks/${framework.id}`}
                className="hover:bg-accent/40 text-sm"
              >
                {framework.name}{" "}
                {framework.version === "2022" ? "(ISO 27001)" : ""}
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Assessments</CardTitle>
            {canCreateAssessment ? (
              <Button asChild size="sm">
                <Link href={`/vendors/${vendor.id}/assessments/new`}>
                  New assessment
                </Link>
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {vendor.assessments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No assessments yet.</p>
          ) : (
            vendor.assessments.map((assessment) => (
              <Link
                key={assessment.id}
                href={`/assessments/${assessment.id}`}
                className="hover:bg-accent/40 flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {assessment.title}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {assessment.template
                      ? `${assessment.template.name} v${assessment.template.version}`
                      : "No template"}
                    {assessment.dueDate
                      ? ` · due ${formatDate(assessment.dueDate)}`
                      : ""}
                  </span>
                </div>
                <Badge variant="secondary">
                  {ASSESSMENT_STATUS_LABELS[assessment.status]}
                </Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
