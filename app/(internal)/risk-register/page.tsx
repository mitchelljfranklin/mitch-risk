import Link from "next/link";

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
import {
  FINDING_STATUSES,
  FINDING_STATUS_LABELS,
} from "@/lib/schemas/assessment";
import { RISK_WEIGHTS } from "@/lib/schemas/template";
import { listAllResponsibilityActions } from "@/lib/db/customer-responsibility";
import {
  CUSTOMER_RESPONSIBILITY_STATUS_LABELS,
  CUSTOMER_RESPONSIBILITY_STATUS_STYLES,
} from "@/lib/schemas/certification";
import { buildBackParam } from "@/lib/nav";

export const dynamic = "force-dynamic";

export const metadata = { title: "Risk register" };

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

  const sp = await searchParams;
  const sort = (sp.sort as FindingSort) || "priority";
  const page = sp.page ? parseInt(sp.page, 10) || 1 : 1;

  const [{ findings, totalCount, pageSize }, summary, vendors] =
    await Promise.all([
      listFindings({
        status: sp.status || undefined,
        severity: sp.severity || undefined,
        vendorId: sp.vendorId || undefined,
        sort,
        page,
      }),
      getFindingSummary(),
      listVendorOptions(),
    ]);

  const showResponsibility = sp.responsibility === "1";
  const responsibilityActions = showResponsibility
    ? await listAllResponsibilityActions(
        sp.vendorId || undefined,
        sp.responsibilityStatus || undefined,
      )
    : [];

  const hasFilters = Boolean(
    sp.status || sp.severity || sp.vendorId || showResponsibility,
  );

  const backParam = buildBackParam("/risk-register", sp, [
    "status",
    "severity",
    "vendorId",
    "responsibility",
    "sort",
    "page",
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Risk register</h1>
        <p className="text-muted-foreground text-sm">
          Every finding across your vendors in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Open findings" value={summary.open} />
        <StatCard
          label="Critical open"
          value={summary.openBySeverity.CRITICAL}
        />
        <StatCard label="Remediated" value={summary.remediated} />
        <StatCard label="Risk accepted" value={summary.riskAccepted} />
      </div>

      <form className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="status">
            Status
          </label>
          <AutoSubmitSelect
            name="status"
            defaultValue={sp.status ?? ""}
            key={`status-${sp.status ?? ""}`}
            emptyOptionLabel="All findings"
            id="status"
            className="w-40"
            ariaLabel="Filter findings by status"
            options={FINDING_STATUSES.map((status) => ({
              value: status,
              label: FINDING_STATUS_LABELS[status],
            }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="severity">
            Severity
          </label>
          <AutoSubmitSelect
            name="severity"
            defaultValue={sp.severity ?? ""}
            key={`severity-${sp.severity ?? ""}`}
            emptyOptionLabel="Any severity"
            id="severity"
            className="w-40"
            ariaLabel="Filter findings by severity"
            options={RISK_WEIGHTS.map((weight) => ({
              value: weight,
              label: weight.charAt(0) + weight.slice(1).toLowerCase(),
            }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="vendorId">
            Vendor
          </label>
          <AutoSubmitSelect
            name="vendorId"
            defaultValue={sp.vendorId ?? ""}
            key={`vendorId-${sp.vendorId ?? ""}`}
            emptyOptionLabel="All vendors"
            id="vendorId"
            className="w-48"
            ariaLabel="Filter findings by vendor"
            options={vendors.map((vendor) => ({
              value: vendor.id,
              label: vendor.name,
            }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="sort">
            Sort
          </label>
          <AutoSubmitSelect
            name="sort"
            defaultValue={sort}
            key={`sort-${sort ?? ""}`}
            id="sort"
            className="w-40"
            ariaLabel="Sort findings"
            options={Object.entries(FINDING_SORTS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            className="text-muted-foreground text-xs"
            htmlFor="responsibility"
          >
            Show
          </label>
          <AutoSubmitSelect
            name="responsibility"
            defaultValue={sp.responsibility ?? ""}
            key={`responsibility-${sp.responsibility ?? ""}`}
            emptyOptionLabel="Findings only"
            id="responsibility"
            className="w-48"
            ariaLabel="Filter by responsibility"
            options={[{ value: "1", label: "Customer responsibility" }]}
          />
        </div>
        <Button type="submit" variant="secondary" size="sm" className="mb-px">
          Filter
        </Button>
        {hasFilters ? (
          <Button asChild variant="ghost" size="sm" className="mb-px">
            <Link href="/risk-register">Clear</Link>
          </Button>
        ) : null}
      </form>

      {findings.length === 0 ? (
        hasFilters ? (
          <p className="text-muted-foreground text-sm">
            No findings match the selected filters.
          </p>
        ) : (
          <EmptyState
            icon="findings"
            title="No findings yet"
            description="Findings are raised automatically when vendors submit assessments with deficient answers."
          />
        )
      ) : (
        <>
          <BulkFindingsWrapper findings={findings} canReview={canReview} />
          <Pagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            itemLabel="findings"
          />
        </>
      )}

      {showResponsibility ? (
        responsibilityActions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No customer responsibility items match the selected filters.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Customer Responsibility</h2>
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
                        {action.vendorName ?? "Vendor"}
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
                        Assigned to {action.assignedToName}
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
                    {
                      CUSTOMER_RESPONSIBILITY_STATUS_LABELS[
                        action.status as keyof typeof CUSTOMER_RESPONSIBILITY_STATUS_LABELS
                      ]
                    }
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
