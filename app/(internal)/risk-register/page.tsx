import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const hasFilters = Boolean(sp.status || sp.severity || sp.vendorId);

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
          <Select name="status" defaultValue={sp.status ?? ""}>
            <SelectTrigger id="status" className="w-40">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              {FINDING_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {FINDING_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="severity">
            Severity
          </label>
          <Select name="severity" defaultValue={sp.severity ?? ""}>
            <SelectTrigger id="severity" className="w-40">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              {RISK_WEIGHTS.map((weight) => (
                <SelectItem key={weight} value={weight}>
                  {weight.charAt(0) + weight.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="vendorId">
            Vendor
          </label>
          <Select name="vendorId" defaultValue={sp.vendorId ?? ""}>
            <SelectTrigger id="vendorId" className="w-48">
              <SelectValue placeholder="All vendors" />
            </SelectTrigger>
            <SelectContent>
              {vendors.map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="sort">
            Sort
          </label>
          <AutoSubmitSelect
            name="sort"
            defaultValue={sort}
            id="sort"
            className="w-40"
            ariaLabel="Sort findings"
            options={Object.entries(FINDING_SORTS).map(([value, label]) => ({
              value,
              label,
            }))}
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
    </div>
  );
}
