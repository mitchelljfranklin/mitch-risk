import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { listVendors, VENDOR_SORTS, type VendorSort } from "@/lib/db/vendors";
import { VENDOR_TIER_LABELS } from "@/lib/schemas/vendor";
import { formatDate, formatPercent, ragTextClass } from "@/lib/utils";
import { ImportVendorsForm } from "./import-vendors-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Vendors" };

type VendorsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function VendorsPage({ searchParams }: VendorsPageProps) {
  const user = await requirePermission(PERMISSIONS.VENDORS_VIEW);
  const canCreateVendor = hasPermission(
    user.permissions,
    PERMISSIONS.VENDORS_CREATE,
  );
  const canSendAssessment = hasPermission(
    user.permissions,
    PERMISSIONS.ASSESSMENTS_CREATE,
  );

  const sp = await searchParams;
  const sort = (sp.sort as VendorSort) || "name";
  const page = sp.page ? parseInt(sp.page, 10) || 1 : 1;
  const { vendors, totalCount, pageSize } = await listVendors({
    query: sp.query,
    tier: sp.tier || undefined,
    sort,
    page,
  });
  const hasFilters = Boolean(sp.query) || Boolean(sp.tier);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground text-sm">
            Vendors you assess for security risk.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/vendors/compare">Compare</Link>
          </Button>
          {canCreateVendor ? <ImportVendorsForm /> : null}
          {canSendAssessment ? (
            <Button asChild variant="outline">
              <Link href="/vendors/bulk-send">Bulk send</Link>
            </Button>
          ) : null}
          {canCreateVendor ? (
            <Button asChild>
              <Link href="/vendors/new">New vendor</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="query">
            Search
          </label>
          <Input
            id="query"
            name="query"
            placeholder="Name or email…"
            defaultValue={sp.query ?? ""}
            className="w-48"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="tier">
            Tier
          </label>
          <Select name="tier" defaultValue={sp.tier ?? ""}>
            <SelectTrigger id="tier" className="w-40">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VENDOR_TIER_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
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
            className="w-48"
            ariaLabel="Sort vendors"
            options={Object.entries(VENDOR_SORTS).map(([value, label]) => ({
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
            <Link href="/vendors">Clear</Link>
          </Button>
        ) : null}
      </form>

      {vendors.length === 0 ? (
        hasFilters ? (
          <p className="text-muted-foreground text-sm">
            No vendors match the selected filters.
          </p>
        ) : (
          <EmptyState
            icon="vendors"
            title="No vendors yet"
            description="Add a vendor to start tracking their security risk."
          />
        )
      ) : (
        <>
          <div className="flex flex-col divide-y rounded-lg border">
            {vendors.map((vendor) => (
              <Link
                key={vendor.id}
                href={`/vendors/${vendor.id}`}
                className="hover:bg-accent/40 flex items-center justify-between gap-4 p-3 transition-colors"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {vendor.name}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {vendor.contactEmail}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  {vendor.tier ? (
                    <Badge variant="outline">
                      {VENDOR_TIER_LABELS[vendor.tier]}
                    </Badge>
                  ) : null}
                  <span className="text-muted-foreground hidden w-28 text-right text-xs sm:inline">
                    {vendor.lastAssessedAt
                      ? `Assessed ${formatDate(vendor.lastAssessedAt)}`
                      : "Not assessed"}
                  </span>
                  <span className="text-muted-foreground hidden w-20 text-right text-xs md:inline">
                    {vendor._count.assessments}{" "}
                    {vendor._count.assessments === 1
                      ? "assessment"
                      : "assessments"}
                  </span>
                  <span
                    className={`w-12 text-right text-sm font-semibold tabular-nums ${ragTextClass(vendor.overallScore)}`}
                  >
                    {vendor.overallScore !== null
                      ? formatPercent(vendor.overallScore)
                      : "—"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            itemLabel="vendors"
          />
        </>
      )}
    </div>
  );
}
