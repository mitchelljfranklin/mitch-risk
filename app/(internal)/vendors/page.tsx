import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { AlertTriangle } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

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
import { VENDOR_TIERS } from "@/lib/schemas/vendor";
import { parseListView, VENDOR_VIEW_COOKIE } from "@/lib/view-preference";
import { buildBackParam } from "@/lib/nav";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations("Vendors");
  return { title: translations("metaTitle") };
}

type VendorsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function VendorsPage({ searchParams }: VendorsPageProps) {
  const user = await requirePermission(PERMISSIONS.VENDORS_VIEW);
  const translations = await getTranslations("Vendors");
  const commonTranslations = await getTranslations("Common");
  const dateFormatter = await getFormatter();
  const canCreateVendor = hasPermission(
    user.permissions,
    PERMISSIONS.VENDORS_CREATE,
  );
  const canSendAssessment = hasPermission(
    user.permissions,
    PERMISSIONS.ASSESSMENTS_CREATE,
  );

  const searchParameters = await searchParams;
  const sort = (searchParameters.sort as VendorSort) || "name";
  const requestedPage = searchParameters.page
    ? Number.parseInt(searchParameters.page, 10)
    : 1;
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const { vendors, totalCount, pageSize } = await listVendors({
    query: searchParameters.query,
    tier: searchParameters.tier || undefined,
    sort,
    page,
  });
  const exportVendors = await exportAllVendors();
  const hasFilters =
    Boolean(searchParameters.query) || Boolean(searchParameters.tier);
  const backParam = buildBackParam("/vendors", searchParameters, [
    "query",
    "tier",
    "sort",
    "page",
  ]);

  const vendorIds = vendors.map((vendor) => vendor.id);
  const findingsSummaryByVendor =
    await getOpenFindingsSummaryByVendor(vendorIds);

  const cookieStore = await cookies();
  const view = parseListView(cookieStore.get(VENDOR_VIEW_COOKIE)?.value);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {translations("title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {translations("subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/vendors/compare">{translations("compare")}</Link>
          </Button>
          <VendorExportButton
            currentVendors={vendors.map((vendor) => ({
              id: vendor.id,
              name: vendor.name,
              externalId: vendor.externalId ?? "",
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
              externalId: vendor.externalId ?? "",
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
              <Link href="/vendors/import">{translations("import")}</Link>
            </Button>
          ) : null}
          {canSendAssessment ? (
            <Button asChild variant="outline">
              <Link href="/vendors/bulk-send">{translations("bulkSend")}</Link>
            </Button>
          ) : null}
          {canCreateVendor ? (
            <Button asChild>
              <Link href="/vendors/new">{translations("newVendor")}</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <form className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs" htmlFor="query">
              {translations("search")}
            </label>
            <Input
              id="query"
              name="query"
              placeholder={translations("searchPlaceholder")}
              defaultValue={searchParameters.query ?? ""}
              className="w-48"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs" htmlFor="tier">
              {translations("tier")}
            </label>
            <AutoSubmitSelect
              name="tier"
              defaultValue={searchParameters.tier ?? ""}
              key={`tier-${searchParameters.tier ?? ""}`}
              emptyOptionLabel={translations("anyTier")}
              id="tier"
              className="w-40"
              ariaLabel={translations("filterTierAria")}
              options={VENDOR_TIERS.map((tier) => ({
                value: tier,
                label: commonTranslations(`tiers.${tier}`),
              }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs" htmlFor="sort">
              {translations("sort")}
            </label>
            <AutoSubmitSelect
              name="sort"
              defaultValue={sort}
              id="sort"
              className="w-48"
              ariaLabel={translations("sortAria")}
              options={Object.keys(VENDOR_SORTS).map((value) => ({
                value,
                label: translations(`sorts.${value}`),
              }))}
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" className="mb-px">
            {translations("filter")}
          </Button>
          {hasFilters ? (
            <Button asChild variant="ghost" size="sm" className="mb-px">
              <Link href="/vendors">{translations("clear")}</Link>
            </Button>
          ) : null}
        </form>
        <ViewToggle
          value={view}
          cookieName={VENDOR_VIEW_COOKIE}
          ariaLabel={translations("viewAria")}
        />
      </div>

      {vendors.length === 0 ? (
        hasFilters ? (
          <p className="text-muted-foreground text-sm">
            {translations("noMatches")}
          </p>
        ) : (
          <EmptyState
            icon="vendors"
            title={translations("emptyTitle")}
            description={translations("emptyDescription")}
          />
        )
      ) : (
        <>
          {view === "cards" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vendors.map((vendor) => {
                const vendorFindings = findingsSummaryByVendor[vendor.id];
                return (
                  <Link
                    key={vendor.id}
                    href={`/vendors/${vendor.id}${backParam}`}
                  >
                    <Card className="hover:bg-accent/40 h-full transition-colors">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="truncate">
                            {vendor.name}
                          </CardTitle>
                          {vendor.tier ? (
                            <Badge variant="outline" className="shrink-0">
                              {commonTranslations.has(`tiers.${vendor.tier}`)
                                ? commonTranslations(`tiers.${vendor.tier}`)
                                : vendor.tier}
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
                              ? translations("assessed", {
                                  date: dateFormatter.dateTime(
                                    vendor.lastAssessedAt,
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    },
                                  ),
                                })
                              : translations("notAssessed")}
                          </span>
                          <span>
                            {translations("assessmentCount", {
                              count: vendor._count.assessments,
                            })}
                          </span>
                          {(vendorFindings?.openCount ?? 0) > 0 ? (
                            <span className="text-destructive flex items-center gap-1">
                              <AlertTriangle className="size-3" />
                              {translations("openFindingCount", {
                                count: vendorFindings?.openCount ?? 0,
                              })}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <ScoreBadge score={vendor.overallScore} size="lg" />
                          {vendorFindings?.severityDots.length ? (
                            <div className="flex gap-0.5">
                              {vendorFindings.severityDots.map(
                                (severity, index) => (
                                  <span
                                    key={`${severity}-${index}`}
                                    className={`size-1.5 rounded-full ${
                                      severity === "CRITICAL" ||
                                      severity === "HIGH"
                                        ? "bg-[var(--rag-red)]"
                                        : "bg-[var(--rag-amber)]"
                                    }`}
                                  />
                                ),
                              )}
                            </div>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
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
              backParam={backParam}
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
              itemLabel={translations("list.items")}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
