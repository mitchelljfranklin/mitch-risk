import Link from "next/link";
import { cookies } from "next/headers";
import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ScoreBadge } from "@/components/score-badge";
import { ViewToggle } from "@/components/view-toggle";
import { VendorsTable } from "./vendors-table";
import { VendorExportButton } from "@/components/vendor-export-button";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import {
  listVendors,
  exportAllVendors,
  VENDOR_SORTS,
  type VendorSort,
} from "@/lib/db/vendors";
import { getOpenFindingsSummaryByVendor } from "@/lib/db/findings";
import { VENDOR_TIER_LABELS } from "@/lib/schemas/vendor";
import { formatDate } from "@/lib/utils";
import { parseListView, VENDOR_VIEW_COOKIE } from "@/lib/view-preference";

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
  const exportVendors = await exportAllVendors();
  const hasFilters = Boolean(sp.query) || Boolean(sp.tier);

  const vendorIds = vendors.map((vendor) => vendor.id);
  const findingsSummaryByVendor =
    await getOpenFindingsSummaryByVendor(vendorIds);

  const cookieStore = await cookies();
  const view = parseListView(cookieStore.get(VENDOR_VIEW_COOKIE)?.value);

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
          <VendorExportButton
            currentVendors={vendors.map((vendor) => ({
              id: vendor.id,
              name: vendor.name,
              contactName: vendor.contactName ?? "",
              contactEmail: vendor.contactEmail,
              tier: vendor.tier,
              website: vendor.website,
              notes: vendor.notes,
              serviceDescription: vendor.serviceDescription,
              dataSensitivity: vendor.dataSensitivity,
              contractRenewalDate:
                vendor.contractRenewalDate?.toISOString().slice(0, 10) ?? null,
              contractValue: vendor.contractValue,
              geographicRisk: vendor.geographicRisk,
              tags: vendor.tags ?? [],
            }))}
            allVendors={exportVendors.map((vendor) => ({
              id: vendor.id,
              name: vendor.name,
              contactName: vendor.contactName ?? "",
              contactEmail: vendor.contactEmail,
              tier: vendor.tier,
              website: vendor.website,
              notes: vendor.notes,
              serviceDescription: vendor.serviceDescription,
              dataSensitivity: vendor.dataSensitivity,
              contractRenewalDate:
                vendor.contractRenewalDate?.toISOString().slice(0, 10) ?? null,
              contractValue: vendor.contractValue,
              geographicRisk: vendor.geographicRisk,
              tags: vendor.tags ?? [],
            }))}
          />
          {canCreateVendor ? (
            <Button asChild variant="outline">
              <Link href="/vendors/import">Import</Link>
            </Button>
          ) : null}
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

      <div className="flex flex-wrap items-end justify-between gap-2">
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
        <ViewToggle
          value={view}
          cookieName={VENDOR_VIEW_COOKIE}
          ariaLabel="Vendor list view"
        />
      </div>

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
          {view === "cards" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vendors.map((vendor) => (
                <Link key={vendor.id} href={`/vendors/${vendor.id}`}>
                  <Card className="hover:bg-accent/40 h-full transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="truncate">
                          {vendor.name}
                        </CardTitle>
                        {vendor.tier ? (
                          <Badge variant="outline" className="shrink-0">
                            {VENDOR_TIER_LABELS[vendor.tier]}
                          </Badge>
                        ) : null}
                      </div>
                      <CardDescription className="truncate">
                        {vendor.contactEmail}
                      </CardDescription>
                      {vendor.tags?.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {vendor.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </CardHeader>
                    <CardContent className="flex items-end justify-between gap-2">
                      <div className="text-muted-foreground flex flex-col gap-0.5 text-xs">
                        <span>
                          {vendor.lastAssessedAt
                            ? `Assessed ${formatDate(vendor.lastAssessedAt)}`
                            : "Not assessed"}
                        </span>
                        <span>
                          {vendor._count.assessments}{" "}
                          {vendor._count.assessments === 1
                            ? "assessment"
                            : "assessments"}
                        </span>
                        {(findingsSummaryByVendor[vendor.id]?.openCount ?? 0) >
                        0 ? (
                          <span className="text-destructive flex items-center gap-1">
                            <AlertTriangle className="size-3" />
                            {findingsSummaryByVendor[vendor.id]!.openCount} open
                            finding
                            {findingsSummaryByVendor[vendor.id]!.openCount !== 1
                              ? "s"
                              : ""}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <ScoreBadge score={vendor.overallScore} size="lg" />
                        {findingsSummaryByVendor[vendor.id]?.severityDots
                          .length ? (
                          <div className="flex gap-0.5">
                            {findingsSummaryByVendor[
                              vendor.id
                            ]!.severityDots.map((severity, index) => (
                              <span
                                key={index}
                                className={`size-1.5 rounded-full ${
                                  severity === "CRITICAL" || severity === "HIGH"
                                    ? "bg-[var(--rag-red)]"
                                    : "bg-[var(--rag-amber)]"
                                }`}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <VendorsTable
              vendors={vendors.map((vendor) => ({
                id: vendor.id,
                name: vendor.name,
                contactEmail: vendor.contactEmail,
                tier: vendor.tier,
                overallScore: vendor.overallScore,
              }))}
              initialSort={sort}
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
            />
          )}
          {view === "cards" ? (
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              itemLabel="vendors"
            />
          ) : null}
        </>
      )}
    </div>
  );
}
