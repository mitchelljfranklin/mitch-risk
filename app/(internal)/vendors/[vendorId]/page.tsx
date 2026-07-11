import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ScoreBadge } from "@/components/score-badge";
import { VendorTimeline } from "@/components/vendor-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionGroup } from "@/components/action-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CertificationsManager } from "@/components/certifications-manager";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FlashToast } from "@/components/flash-toast";
import { ProgressBar } from "@/components/progress-bar";
import { deleteVendorAction } from "@/lib/actions/vendors";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { listVendorCertifications } from "@/lib/db/certifications";
import { prisma } from "@/lib/prisma";
import { getVendorProfile } from "@/lib/db/compliance";
import { listVendorFindings } from "@/lib/db/findings";
import { listFrameworks } from "@/lib/db/frameworks";
import { getVendor } from "@/lib/db/vendors";
import { buildVendorTimeline } from "@/lib/db/vendor-timeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ASSESSMENT_STATUS_LABELS,
  FINDING_STATUS_LABELS,
  FINDING_STATUS_STYLES,
  SEVERITY_STYLES,
} from "@/lib/schemas/assessment";
import {
  DATA_SENSITIVITY_LABELS,
  VENDOR_TIER_LABELS,
} from "@/lib/schemas/vendor";
import { cn, formatDate, formatPercent } from "@/lib/utils";

function computeInherentRisk(vendor: {
  tier: string | null;
  dataSensitivity: string | null;
}): number | null {
  const tierWeights: Record<string, number> = {
    CRITICAL: 1,
    HIGH: 0.75,
    MEDIUM: 0.5,
    LOW: 0.25,
  };
  const sensitivityWeights: Record<string, number> = {
    RESTRICTED: 1,
    CONFIDENTIAL: 0.75,
    INTERNAL: 0.5,
    PUBLIC: 0.25,
  };
  const tierScore = vendor.tier ? (tierWeights[vendor.tier] ?? 0.5) : 0.5;
  const sensitivityScore = vendor.dataSensitivity
    ? (sensitivityWeights[vendor.dataSensitivity] ?? 0.5)
    : 0.5;
  return (tierScore + sensitivityScore) / 2;
}

export const dynamic = "force-dynamic";

type VendorDetailPageProps = {
  params: Promise<{ vendorId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
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
  searchParams,
}: VendorDetailPageProps) {
  const sp = await searchParams;
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
  const canViewFindings = hasPermission(
    user.permissions,
    PERMISSIONS.ASSESSMENTS_VIEW,
  );
  const { vendorId } = await params;
  const vendor = await getVendor(vendorId);
  if (!vendor) {
    notFound();
  }

  const [profile, frameworks, findings, certifications] = await Promise.all([
    getVendorProfile(vendorId),
    listFrameworks(),
    canViewFindings ? listVendorFindings(vendorId) : Promise.resolve([]),
    listVendorCertifications(vendorId),
  ]);
  const openFindings = findings.filter((finding) => finding.status === "OPEN");

  const timeline = buildVendorTimeline({
    vendorId,
    assessments: vendor.assessments.map((assessment) => ({
      id: assessment.id,
      title: assessment.title,
      status: assessment.status,
      createdAt: assessment.createdAt,
      accessToken: assessment.accessToken,
      submittedAt: assessment.submittedAt,
    })),
    findings: findings.map((finding) => ({
      id: finding.id,
      title: finding.title,
      status: finding.status,
      createdAt: finding.createdAt,
      resolvedAt: finding.resolvedAt,
    })),
    certifications: certifications.map((certification) => ({
      id: certification.id,
      name: certification.name,
      issuedDate: certification.issuedDate,
      expiresDate: certification.expiresDate,
      createdAt: certification.createdAt,
    })),
  });
  const certificationViews = certifications.map((cert) => ({
    id: cert.id,
    name: cert.name,
    issuer: cert.issuer ?? "",
    issuedDate: cert.issuedDate
      ? cert.issuedDate.toISOString().slice(0, 10)
      : "",
    expiresDate: cert.expiresDate.toISOString().slice(0, 10),
    notes: cert.notes ?? "",
  }));

  // Fetch attachments for all certifications on this vendor.
  const certAttachmentMap = new Map<
    string,
    { id: string; fileName: string; displayName: string | null }[]
  >();
  const certAttachments =
    certifications.length > 0
      ? await prisma.attachment.findMany({
          where: {
            entityType: "VendorCertification",
            entityId: {
              in: certifications.map((certification) => certification.id),
            },
          },
          orderBy: { createdAt: "asc" },
        })
      : [];
  for (const a of certAttachments) {
    const list = certAttachmentMap.get(a.entityId) ?? [];
    list.push({ id: a.id, fileName: a.fileName, displayName: a.displayName });
    certAttachmentMap.set(a.entityId, list);
  }

  const vendorAttachments = await prisma.attachment.findMany({
    where: { entityType: "Vendor", entityId: vendor.id },
    orderBy: { createdAt: "desc" },
  });

  const defaultTab = sp.tab ?? "overview";
  const allowedTabs = [
    "overview",
    "compliance",
    ...(canViewFindings ? ["findings"] : []),
    "assessments",
  ];
  const safeTab = allowedTabs.includes(defaultTab) ? defaultTab : "overview";

  const hasOverviewFields =
    vendor.serviceDescription ||
    vendor.owner ||
    vendor.dataSensitivity ||
    vendor.contractRenewalDate ||
    vendor.website ||
    vendorAttachments.length > 0;

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      {sp.created ? <FlashToast message="Vendor created." /> : null}
      <Breadcrumbs
        segments={[
          { label: "Vendors", href: "/vendors" },
          { label: vendor.name },
        ]}
      />

      <div>
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {vendor.name}
            {vendor.tier ? (
              <Badge variant="outline">{VENDOR_TIER_LABELS[vendor.tier]}</Badge>
            ) : null}
          </h1>
          <ActionGroup>
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
          </ActionGroup>
        </div>
        <div className="mt-1 flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            {vendor.contactName ? `${vendor.contactName} · ` : ""}
            {vendor.contactEmail}
          </span>
          {vendor.overallScore !== null ? (
            <ScoreBadge score={vendor.overallScore} />
          ) : null}
        </div>
      </div>

      <Tabs defaultValue={safeTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          {canViewFindings ? (
            <TabsTrigger value="findings">
              Findings
              {openFindings.length > 0 ? (
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {openFindings.length}
                </Badge>
              ) : null}
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {hasOverviewFields ? (
              <Card>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {vendor.serviceDescription ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-xs">
                        Service provided
                      </span>
                      <span className="text-sm">
                        {vendor.serviceDescription}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground text-xs">
                      Risk owner
                    </span>
                    <span className="text-sm">
                      {vendor.owner?.name ?? "Unassigned"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground text-xs">
                      Data sensitivity
                    </span>
                    <span className="text-sm">
                      {vendor.dataSensitivity
                        ? DATA_SENSITIVITY_LABELS[vendor.dataSensitivity]
                        : "Unspecified"}
                    </span>
                  </div>
                  {vendor.website ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-xs">
                        Website
                      </span>
                      <a
                        href={vendor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary truncate text-sm hover:underline"
                      >
                        {vendor.website}
                      </a>
                    </div>
                  ) : null}
                  {vendor.contractRenewalDate ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-xs">
                        Contract renewal
                      </span>
                      <span
                        className={`text-sm ${
                          vendor.contractRenewalDate < new Date()
                            ? "text-destructive font-medium"
                            : ""
                        }`}
                      >
                        {formatDate(vendor.contractRenewalDate)}
                        {vendor.contractRenewalDate < new Date()
                          ? " · overdue"
                          : ""}
                      </span>
                    </div>
                  ) : null}
                  {vendorAttachments.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground text-xs">
                        Attachments
                      </span>
                      <div className="flex flex-col gap-1">
                        {vendorAttachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={`/api/attachments/${attachment.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary text-sm hover:underline"
                          >
                            {attachment.displayName ?? attachment.fileName} ↗
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <EmptyState
                    compact
                    icon="vendors"
                    title="No overview details"
                    description="Edit this vendor to add service details, a risk owner, and other profile information."
                  />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Risk profile</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {(() => {
                  const inherent = computeInherentRisk(vendor);
                  return inherent !== null ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">
                          Inherent (pre-assessment)
                        </span>
                        <Badge variant="secondary" className="text-[11px]">
                          {formatPercent(inherent)}
                        </Badge>
                      </div>
                      {vendor.overallScore !== null ? (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">
                            Residual (assessed)
                          </span>
                          <ScoreBadge score={vendor.overallScore} size="sm" />
                        </div>
                      ) : null}
                    </div>
                  ) : null;
                })()}
                {profile != null && profile.overallScore != null ? (
                  <div className="flex items-center gap-2">
                    <ScoreBadge score={profile.overallScore} size="lg" />
                    <span className="text-muted-foreground text-xs">
                      overall
                    </span>
                    {profile.trend !== "stable" ? (
                      <Badge
                        variant={
                          profile.trend === "up" ? "default" : "destructive"
                        }
                        className="text-[11px]"
                      >
                        {profile.trend === "up"
                          ? "Trending up ↑"
                          : "Trending down ↓"}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[11px]">
                        Stable →
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No score yet — submit an assessment.
                  </p>
                )}
                {profile && profile.history.length > 0 ? (
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
                              <span className="text-muted-foreground text-xs">
                                {item.score !== null
                                  ? formatPercent(item.score)
                                  : "—"}
                              </span>
                              <div
                                className={`w-full rounded-sm ${
                                  ratio >= 0.85
                                    ? "bg-[var(--rag-green)]"
                                    : ratio >= 0.6
                                      ? "bg-[var(--rag-amber)]"
                                      : "bg-[var(--rag-red)]"
                                } ${ratio === 0 ? "bg-muted" : ""}`}
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
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Certifications &amp; attestations</CardTitle>
            </CardHeader>
            <CardContent>
              <CertificationsManager
                vendorId={vendor.id}
                certifications={certificationViews}
                attachments={certAttachmentMap}
                canEdit={canEditVendor}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="mt-4 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Domain compliance</CardTitle>
            </CardHeader>
            <CardContent>
              {profile && profile.domainBreakdown.length > 0 ? (
                <div className="flex flex-col gap-3">
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
                        <ProgressBar
                          value={ratioPercent}
                          className={cn(
                            ratioPercent >= 85
                              ? "bg-[var(--rag-green)]"
                              : ratioPercent >= 60
                                ? "bg-[var(--rag-amber)]"
                                : "bg-[var(--rag-red)]",
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  compact
                  icon="assessments"
                  title="No compliance data"
                  description="Complete an assessment to see domain compliance scores."
                />
              )}
            </CardContent>
          </Card>

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
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Framework heatmaps</CardTitle>
              </CardHeader>
              <CardContent>
                <EmptyState
                  compact
                  icon="frameworks"
                  title="No frameworks available"
                  description="Import or seed framework libraries to map controls to assessment questions."
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {canViewFindings ? (
          <TabsContent value="findings" className="mt-4 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  Findings
                  {openFindings.length > 0 ? (
                    <span className="text-muted-foreground ml-2 text-sm font-normal">
                      {openFindings.length} open
                    </span>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {findings.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {findings.map((finding) => (
                      <Link
                        key={finding.id}
                        href={`/assessments/${finding.assessmentId}`}
                        className="hover:bg-accent/40 flex items-center justify-between gap-3 rounded-md border p-3"
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium">
                            {finding.title}
                          </span>
                          <span className="text-muted-foreground truncate text-xs">
                            {finding.assessmentTitle}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge
                            className={SEVERITY_STYLES[finding.severity] ?? ""}
                          >
                            {finding.severity.charAt(0) +
                              finding.severity.slice(1).toLowerCase()}
                          </Badge>
                          <Badge
                            className={
                              FINDING_STATUS_STYLES[finding.status] ?? ""
                            }
                          >
                            {FINDING_STATUS_LABELS[finding.status] ??
                              finding.status}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    compact
                    icon="findings"
                    title="No findings"
                    description="Findings are generated when assessment answers are non-compliant. Complete an assessment to see findings here."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        <TabsContent value="assessments" className="mt-4 flex flex-col gap-6">
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
            <CardContent>
              {vendor.assessments.length === 0 ? (
                <EmptyState
                  compact
                  icon="assessments"
                  title="No assessments"
                  description="No assessments have been created for this vendor yet."
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {vendor.assessments.map((assessment) => (
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <VendorTimeline events={timeline} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
