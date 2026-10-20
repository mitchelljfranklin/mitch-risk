import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { cache } from "react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ScoreBadge } from "@/components/score-badge";
import { VendorTimeline } from "@/components/vendor-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionGroup } from "@/components/action-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CertificationsManager } from "@/components/certifications-manager";
import { CustomerResponsibilityManager } from "@/components/customer-responsibility-manager";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FlashToast } from "@/components/flash-toast";
import { ProgressBar } from "@/components/progress-bar";
import { ScoreStatCard } from "@/components/stat-card";
import { deleteVendorAction } from "@/lib/actions/vendors";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { listVendorCertifications } from "@/lib/db/certifications";
import { prisma } from "@/lib/prisma";
import { getVendorProfile } from "@/lib/db/compliance";
import { listFindings } from "@/lib/db/findings";
import {
  listFrameworks,
  listFrameworksWithSharedControls,
} from "@/lib/db/frameworks";
import { getVendor } from "@/lib/db/vendors";
import { getCustomerResponsibilityCompliance } from "@/lib/db/customer-responsibility";
import { buildVendorTimeline } from "@/lib/db/vendor-timeline";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UrlTabs } from "@/components/url-tabs";
import { resolveBackHref } from "@/lib/nav";
import {
  FINDING_STATUS_STYLES,
  SEVERITY_STYLES,
} from "@/lib/schemas/assessment";
import { cn, formatPercent } from "@/lib/utils";

const MAX_VENDOR_ASSESSMENTS = 10;

// generateMetadata and the page both need the vendor; request-scoped
// deduplication stops the heaviest query from running twice.
const getVendorCached = cache(getVendor);

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
  const vendor = await getVendorCached(vendorId);
  if (!vendor) {
    const translations = await getTranslations("Vendors.detail");
    return { title: translations("notFound") };
  }
  return { title: vendor.name };
}

export default async function VendorDetailPage({
  params,
  searchParams,
}: VendorDetailPageProps) {
  const searchParameters = await searchParams;
  const translations = await getTranslations("Vendors.detail");
  const commonTranslations = await getTranslations("Common");
  const formTranslations = await getTranslations("Vendors.form");
  const timelineTranslations = await getTranslations("Vendors.timeline");
  const dateFormatter = await getFormatter();
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
  const vendor = await getVendorCached(vendorId);
  if (!vendor) {
    notFound();
  }

  const [profile, frameworks, findingsResult, certifications] =
    await Promise.all([
      getVendorProfile(vendorId),
      listFrameworks(),
      canViewFindings
        ? listFindings({ vendorId })
        : Promise.resolve({
            findings: [],
            totalCount: 0,
            page: 1,
            pageSize: 20,
          }),
      listVendorCertifications(vendorId),
    ]);
  const findings = findingsResult.findings;
  const totalFindings = findingsResult.totalCount;

  // Second parallel batch - these four are independent of each other.
  const [
    openFindingsCount,
    responsibilityCompliance,
    certificationAttachments,
    vendorAttachments,
  ] = await Promise.all([
    canViewFindings
      ? prisma.finding.count({
          where: { status: "OPEN", assessment: { vendorId } },
        })
      : Promise.resolve(0),
    getCustomerResponsibilityCompliance(vendorId),
    certifications.length > 0
      ? prisma.attachment.findMany({
          where: {
            entityType: "VendorCertification",
            entityId: {
              in: certifications.map((certification) => certification.id),
            },
          },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    prisma.attachment.findMany({
      where: { entityType: "Vendor", entityId: vendor.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const timeline = buildVendorTimeline(
    {
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
    },
    {
      translate: timelineTranslations,
      formatDate: (date) =>
        dateFormatter.dateTime(date, {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }),
    },
  );
  const certificationViews = certifications.map((certification) => ({
    id: certification.id,
    name: certification.name,
    issuer: certification.issuer ?? "",
    issuedDate: certification.issuedDate
      ? certification.issuedDate.toISOString().slice(0, 10)
      : "",
    expiresDate: certification.expiresDate.toISOString().slice(0, 10),
    notes: certification.notes ?? "",
  }));

  // Fetch attachments for all certifications on this vendor.
  const certificationAttachmentMap = new Map<
    string,
    { id: string; fileName: string; displayName: string | null }[]
  >();
  for (const attachment of certificationAttachments) {
    const attachmentsForCertification =
      certificationAttachmentMap.get(attachment.entityId) ?? [];
    attachmentsForCertification.push({
      id: attachment.id,
      fileName: attachment.fileName,
      displayName: attachment.displayName,
    });
    certificationAttachmentMap.set(
      attachment.entityId,
      attachmentsForCertification,
    );
  }

  const frameworkOptions = await listFrameworksWithSharedControls();

  const defaultTab = searchParameters.tab ?? "overview";
  const allowedTabs = [
    "overview",
    "compliance",
    ...(canViewFindings ? ["findings"] : []),
    "assessments",
  ];
  const safeTab = allowedTabs.includes(defaultTab) ? defaultTab : "overview";
  const frameworkBackParam = searchParameters.back
    ? `&back=${encodeURIComponent(searchParameters.back)}`
    : "";

  const hasOverviewFields =
    vendor.serviceDescription ||
    vendor.owner ||
    vendor.externalId ||
    vendor.dataSensitivity ||
    vendor.contractRenewalDate ||
    vendor.website ||
    vendorAttachments.length > 0;

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      {searchParameters.created ? (
        <FlashToast message={translations("created")} />
      ) : null}
      <Breadcrumbs
        segments={
          searchParameters.back?.startsWith("/risk-register")
            ? [
                {
                  label: translations("breadcrumbs.riskRegister"),
                  href: searchParameters.back,
                },
                { label: vendor.name },
              ]
            : [
                {
                  label: translations("breadcrumbs.vendors"),
                  href: resolveBackHref(
                    searchParameters.back,
                    "/vendors",
                    "/vendors",
                  ),
                },
                { label: vendor.name },
              ]
        }
      />

      <div>
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {vendor.name}
            {vendor.tier ? (
              <Badge variant="outline">
                {commonTranslations(`tiers.${vendor.tier}`)}
              </Badge>
            ) : null}
          </h1>
          <ActionGroup>
            {canEditVendor ? (
              <Button asChild variant="outline">
                <Link href={`/vendors/${vendor.id}/edit`}>
                  {translations("edit")}
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm">
              <a href={`/api/v1/vendors/${vendor.id}/export`} download>
                {translations("exportCsv")}
              </a>
            </Button>
            {canDeleteVendor ? (
              <form
                id={`delete-vendor-${vendor.id}`}
                action={deleteVendorAction}
              >
                <input type="hidden" name="vendorId" value={vendor.id} />
                <ConfirmDialog
                  title={translations("deleteTitle")}
                  description={translations("deleteDescription", {
                    vendorName: vendor.name,
                    count: vendor.assessments.length,
                  })}
                  formId={`delete-vendor-${vendor.id}`}
                >
                  <Button type="button" variant="outline">
                    {translations("delete")}
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
        {vendor.tags?.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {vendor.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[11px]">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <UrlTabs
        defaultTab={safeTab}
        allowedTabs={allowedTabs}
        scrollable
        className="max-w-full"
      >
        <TabsList>
          <TabsTrigger value="overview">
            {translations("tabs.overview")}
          </TabsTrigger>
          <TabsTrigger value="compliance">
            {translations("tabs.compliance")}
          </TabsTrigger>
          {canViewFindings ? (
            <TabsTrigger value="findings">
              {translations("tabs.findings")}
              {openFindingsCount > 0 ? (
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {openFindingsCount}
                </Badge>
              ) : null}
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="assessments">
            {translations("tabs.assessments")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {hasOverviewFields ? (
              <Card>
                <CardHeader>
                  <CardTitle>{translations("overview.title")}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {vendor.serviceDescription ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-xs">
                        {translations("overview.serviceProvided")}
                      </span>
                      <span className="text-sm">
                        {vendor.serviceDescription}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground text-xs">
                      {translations("overview.riskOwner")}
                    </span>
                    <span className="text-sm">
                      {vendor.owner?.name ??
                        translations("overview.unassigned")}
                    </span>
                  </div>
                  {vendor.externalId ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-xs">
                        {translations("overview.externalId")}
                      </span>
                      <span className="font-mono text-sm">
                        {vendor.externalId}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground text-xs">
                      {translations("overview.dataSensitivity")}
                    </span>
                    <span className="text-sm">
                      {vendor.dataSensitivity
                        ? formTranslations(
                            `dataSensitivities.${vendor.dataSensitivity}`,
                          )
                        : translations("overview.unspecified")}
                    </span>
                  </div>
                  {vendor.website ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-xs">
                        {translations("overview.website")}
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
                        {translations("overview.contractRenewal")}
                      </span>
                      <span
                        className={`text-sm ${
                          vendor.contractRenewalDate < new Date()
                            ? "text-destructive font-medium"
                            : ""
                        }`}
                      >
                        {dateFormatter.dateTime(vendor.contractRenewalDate, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                        {vendor.contractRenewalDate < new Date()
                          ? translations("overview.overdue")
                          : ""}
                      </span>
                    </div>
                  ) : null}
                  {vendorAttachments.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground text-xs">
                        {translations("overview.attachments")}
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
                  <CardTitle>{translations("overview.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <EmptyState
                    compact
                    icon="vendors"
                    title={translations("overview.emptyTitle")}
                    description={translations("overview.emptyDescription")}
                  />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>{translations("riskProfile.title")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {translations("riskProfile.inherent")}
                    </span>
                    <Badge variant="secondary" className="text-[11px]">
                      {formatPercent(computeInherentRisk(vendor) ?? 0)}
                    </Badge>
                  </div>
                  {profile != null && profile.overallScore != null ? (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {translations("riskProfile.residual")}
                      </span>
                      <ScoreBadge score={profile.overallScore} size="sm" />
                      {profile.trend !== "stable" ? (
                        <Badge
                          variant={
                            profile.trend === "up" ? "default" : "destructive"
                          }
                          className="text-[11px]"
                        >
                          {profile.trend === "up"
                            ? translations("riskProfile.trendingUp")
                            : translations("riskProfile.trendingDown")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[11px]">
                          {translations("riskProfile.stable")}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      {translations("riskProfile.noScore")}
                    </span>
                  )}
                </div>
                {profile && profile.history.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-muted-foreground text-xs font-medium">
                      {translations("riskProfile.trend")}
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
                        {translations("riskProfile.compareLastTwo")}
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{translations("certifications")}</CardTitle>
            </CardHeader>
            <CardContent>
              <CertificationsManager
                vendorId={vendor.id}
                certifications={certificationViews}
                attachments={certificationAttachmentMap}
                canEdit={canEditVendor}
                frameworkOptions={frameworkOptions}
              />
            </CardContent>
          </Card>

          <CustomerResponsibilityManager
            vendorId={vendor.id}
            canEdit={canEditVendor}
          />
        </TabsContent>

        <TabsContent value="compliance" className="mt-4 flex flex-col gap-6">
          {responsibilityCompliance ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <ScoreStatCard
                label={translations("compliance.vendorCompliance")}
                score={vendor.overallScore}
              />
              <ScoreStatCard
                label={translations("compliance.yourCompliance")}
                score={
                  responsibilityCompliance.total > 0
                    ? responsibilityCompliance.percent / 100
                    : null
                }
              />
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>
                {translations("compliance.domainCompliance")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile && profile.frameworkCompliance.length > 0 ? (
                <div className="flex flex-col gap-5">
                  {profile.frameworkCompliance.map((framework) => (
                    <div
                      key={framework.frameworkId}
                      className="flex flex-col gap-2"
                    >
                      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        {framework.frameworkName}
                        {framework.frameworkVersion
                          ? ` ${framework.frameworkVersion}`
                          : ""}
                      </h3>
                      {framework.domains.map((item) => {
                        const ratioPercent = Math.round(
                          item.complianceRatio * 100,
                        );
                        return (
                          <div
                            key={item.domain}
                            className="flex flex-col gap-1"
                          >
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
                  ))}
                </div>
              ) : (
                <EmptyState
                  compact
                  icon="assessments"
                  title={translations("compliance.noDataTitle")}
                  description={translations("compliance.noDataDescription")}
                />
              )}
            </CardContent>
          </Card>

          {frameworks.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {translations("compliance.frameworkHeatmaps")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {frameworks.map((framework) => {
                  const compliance = profile?.frameworkCompliance.find(
                    (item) => item.frameworkId === framework.id,
                  );
                  const hasData = (compliance?.mappedControlCount ?? 0) > 0;
                  return (
                    <div
                      key={framework.id}
                      className="flex items-center justify-between"
                    >
                      <Link
                        href={`/vendors/${vendor.id}/frameworks/${framework.id}?tab=${safeTab}${frameworkBackParam}`}
                        className="hover:bg-accent/40 text-sm"
                      >
                        {framework.name}{" "}
                        {framework.version === "2022" ? "(ISO 27001)" : ""}
                      </Link>
                      {!hasData ? (
                        <span className="text-muted-foreground text-xs">
                          {translations("compliance.noAssessmentData")}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  {translations("compliance.frameworkHeatmaps")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EmptyState
                  compact
                  icon="frameworks"
                  title={translations("compliance.noFrameworksTitle")}
                  description={translations(
                    "compliance.noFrameworksDescription",
                  )}
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
                  {translations("findings.title")}
                  {openFindingsCount > 0 ? (
                    <span className="text-muted-foreground ml-2 text-sm font-normal">
                      {translations("findings.openCount", {
                        count: openFindingsCount,
                      })}
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
                            {commonTranslations.has(`tiers.${finding.severity}`)
                              ? commonTranslations(`tiers.${finding.severity}`)
                              : finding.severity}
                          </Badge>
                          <Badge
                            className={
                              FINDING_STATUS_STYLES[finding.status] ?? ""
                            }
                          >
                            {commonTranslations.has(
                              `findingStatuses.${finding.status}`,
                            )
                              ? commonTranslations(
                                  `findingStatuses.${finding.status}`,
                                )
                              : finding.status}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                    {totalFindings > findings.length ? (
                      <Link
                        href={`/risk-register?vendorId=${vendor.id}`}
                        className="text-muted-foreground text-xs hover:underline"
                      >
                        {translations("findings.viewAll", {
                          count: totalFindings,
                        })}
                      </Link>
                    ) : null}
                  </div>
                ) : (
                  <EmptyState
                    compact
                    icon="findings"
                    title={translations("findings.emptyTitle")}
                    description={translations("findings.emptyDescription")}
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
                <CardTitle>{translations("assessments.title")}</CardTitle>
                {canCreateAssessment ? (
                  <Button asChild size="sm">
                    <Link href={`/vendors/${vendor.id}/assessments/new`}>
                      {translations("assessments.new")}
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
                  title={translations("assessments.emptyTitle")}
                  description={translations("assessments.emptyDescription")}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {vendor.assessments
                    .slice(0, MAX_VENDOR_ASSESSMENTS)
                    .map((assessment) => (
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
                              : translations("assessments.noTemplate")}
                            {assessment.dueDate
                              ? translations("assessments.due", {
                                  date: dateFormatter.dateTime(
                                    assessment.dueDate,
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                      timeZone: "UTC",
                                    },
                                  ),
                                })
                              : ""}
                          </span>
                        </div>
                        <Badge variant="secondary">
                          {commonTranslations.has(
                            `assessmentStatuses.${assessment.status}`,
                          )
                            ? commonTranslations(
                                `assessmentStatuses.${assessment.status}`,
                              )
                            : assessment.status}
                        </Badge>
                      </Link>
                    ))}
                  {vendor.assessments.length > MAX_VENDOR_ASSESSMENTS ? (
                    <Link
                      href={`/assessments?vendorId=${vendor.id}`}
                      className="text-muted-foreground text-xs hover:underline"
                    >
                      {translations("assessments.viewAll", {
                        count: vendor.assessments.length,
                      })}
                    </Link>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{translations("assessments.activity")}</CardTitle>
            </CardHeader>
            <CardContent>
              <VendorTimeline events={timeline} />
            </CardContent>
          </Card>
        </TabsContent>
      </UrlTabs>
    </div>
  );
}
