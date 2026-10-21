import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/stat-card";
import { BulkFindingsWrapper } from "@/components/bulk-findings-wrapper";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import {
  FINDING_SORTS,
  type FindingSort,
  getFindingSummary,
  listFindings,
} from "@/lib/db/findings";
import { listVendorOptions } from "@/lib/db/vendors";
import { FINDING_STATUSES } from "@/lib/schemas/assessment";
import { RISK_WEIGHTS } from "@/lib/schemas/template";
import { listAllResponsibilityActions } from "@/lib/db/customer-responsibility";
import { CUSTOMER_RESPONSIBILITY_STATUS_STYLES } from "@/lib/schemas/certification";
import { buildBackParam } from "@/lib/nav";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("RiskRegister");
  return { title: translations("metaTitle") };
}

type RiskRegisterPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function RiskRegisterPage({
  searchParams,
}: RiskRegisterPageProps) {
  const user = await requirePermission(PERMISSIONS.ASSESSMENTS_VIEW);
  const canReview = hasPermission(
    user.permissions,
    PERMISSIONS.ASSESSMENTS_REVIEW,
  );
  const translations = await getTranslations("RiskRegister");
  const commonTranslations = await getTranslations("Common");
  const responsibilityTranslations = await getTranslations(
    "Vendors.customerResponsibility",
  );

  const searchParameters = await searchParams;
  const sort = (searchParameters.sort as FindingSort) || "priority";
  const pageNumber = searchParameters.page
    ? parseInt(searchParameters.page, 10) || 1
    : 1;

  const [{ findings, totalCount, pageSize }, summary, vendors] =
    await Promise.all([
      listFindings({
        status: searchParameters.status || undefined,
        severity: searchParameters.severity || undefined,
        vendorId: searchParameters.vendorId || undefined,
        sort,
        page: pageNumber,
      }),
      getFindingSummary(),
      listVendorOptions(),
    ]);

  const showResponsibility = searchParameters.responsibility === "1";
  const responsibilityActions = showResponsibility
    ? await listAllResponsibilityActions(
        searchParameters.vendorId || undefined,
        searchParameters.responsibilityStatus || undefined,
      )
    : [];

  const hasFilters = Boolean(
    searchParameters.status ||
    searchParameters.severity ||
    searchParameters.vendorId ||
    showResponsibility,
  );

  const backParam = buildBackParam("/risk-register", searchParameters, [
    "status",
    "severity",
    "vendorId",
    "responsibility",
    "sort",
    "page",
  ]);

  const statusOptions = FINDING_STATUSES.map((status) => ({
    value: status,
    label: commonTranslations.has(`findingStatuses.${status}`)
      ? commonTranslations(`findingStatuses.${status}`)
      : status,
  }));

  const severityOptions = RISK_WEIGHTS.map((severity) => ({
    value: severity,
    label: commonTranslations.has(`tiers.${severity}`)
      ? commonTranslations(`tiers.${severity}`)
      : severity,
  }));

  const sortOptions = FINDING_SORTS.map((value) => ({
    value,
    label: translations(`filters.sorts.${value}`),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {translations("title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {translations("subtitle")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label={translations("stats.open")} value={summary.open} />
        <StatCard
          label={translations("stats.criticalOpen")}
          value={summary.openBySeverity.CRITICAL}
        />
        <StatCard
          label={translations("stats.remediated")}
          value={summary.remediated}
        />
        <StatCard
          label={translations("stats.riskAccepted")}
          value={summary.riskAccepted}
        />
      </div>

      <form className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="status">
            {translations("filters.status")}
          </label>
          <AutoSubmitSelect
            name="status"
            defaultValue={searchParameters.status ?? ""}
            key={`status-${searchParameters.status ?? ""}`}
            emptyOptionLabel={translations("filters.allFindings")}
            id="status"
            className="w-40"
            ariaLabel={translations("filters.statusAriaLabel")}
            options={statusOptions}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="severity">
            {translations("filters.severity")}
          </label>
          <AutoSubmitSelect
            name="severity"
            defaultValue={searchParameters.severity ?? ""}
            key={`severity-${searchParameters.severity ?? ""}`}
            emptyOptionLabel={translations("filters.anySeverity")}
            id="severity"
            className="w-40"
            ariaLabel={translations("filters.severityAriaLabel")}
            options={severityOptions}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="vendorId">
            {translations("filters.vendor")}
          </label>
          <AutoSubmitSelect
            name="vendorId"
            defaultValue={searchParameters.vendorId ?? ""}
            key={`vendorId-${searchParameters.vendorId ?? ""}`}
            emptyOptionLabel={translations("filters.allVendors")}
            id="vendorId"
            className="w-48"
            ariaLabel={translations("filters.vendorAriaLabel")}
            options={vendors.map((vendor) => ({
              value: vendor.id,
              label: vendor.name,
            }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="sort">
            {translations("filters.sort")}
          </label>
          <AutoSubmitSelect
            name="sort"
            defaultValue={sort}
            key={`sort-${sort ?? ""}`}
            id="sort"
            className="w-40"
            ariaLabel={translations("filters.sortAriaLabel")}
            options={sortOptions}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            className="text-muted-foreground text-xs"
            htmlFor="responsibility"
          >
            {translations("filters.show")}
          </label>
          <AutoSubmitSelect
            name="responsibility"
            defaultValue={searchParameters.responsibility ?? ""}
            key={`responsibility-${searchParameters.responsibility ?? ""}`}
            emptyOptionLabel={translations("filters.findingsOnly")}
            id="responsibility"
            className="w-48"
            ariaLabel={translations("filters.responsibilityAriaLabel")}
            options={[
              {
                value: "1",
                label: translations("filters.customerResponsibility"),
              },
            ]}
          />
        </div>
        <Button type="submit" variant="secondary" size="sm" className="mb-px">
          {translations("filters.apply")}
        </Button>
        {hasFilters ? (
          <Button asChild variant="ghost" size="sm" className="mb-px">
            <Link href="/risk-register">{translations("filters.clear")}</Link>
          </Button>
        ) : null}
      </form>

      {findings.length === 0 ? (
        hasFilters ? (
          <p className="text-muted-foreground text-sm">
            {translations("emptyFiltered")}
          </p>
        ) : (
          <EmptyState
            icon="findings"
            title={translations("emptyTitle")}
            description={translations("emptyDescription")}
          />
        )
      ) : (
        <>
          <BulkFindingsWrapper findings={findings} canReview={canReview} />
          <Pagination
            page={pageNumber}
            pageSize={pageSize}
            totalCount={totalCount}
            itemLabel={translations("items")}
          />
        </>
      )}

      {showResponsibility ? (
        responsibilityActions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {translations("responsibility.noMatch")}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">
              {translations("responsibility.title")}
            </h2>
            <div className="flex flex-col divide-y rounded-lg border">
              {responsibilityActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between gap-3 p-3"
                >
                  <div className="flex min-w-0 flex-col">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/vendors/${action.vendorId}${backParam}`}
                        className="text-xs font-medium hover:underline"
                      >
                        {action.vendorName ??
                          translations("responsibility.vendorFallback")}
                      </Link>
                      <span className="text-muted-foreground font-mono text-xs">
                        {action.controlCode}
                      </span>
                    </div>
                    <span className="truncate text-sm">
                      {action.controlTitle}
                    </span>
                    {action.assignedToName ? (
                      <span className="text-muted-foreground text-xs">
                        {translations("responsibility.assignedTo", {
                          name: action.assignedToName,
                        })}
                      </span>
                    ) : null}
                  </div>
                  <Badge
                    className={
                      CUSTOMER_RESPONSIBILITY_STATUS_STYLES[
                        action.status as keyof typeof CUSTOMER_RESPONSIBILITY_STATUS_STYLES
                      ] ?? ""
                    }
                  >
                    {responsibilityTranslations.has(`statuses.${action.status}`)
                      ? responsibilityTranslations(`statuses.${action.status}`)
                      : action.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
