import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCharts } from "@/components/dashboard-charts";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/db/compliance";
import { VENDOR_TIER_LABELS } from "@/lib/schemas/vendor";
import { formatDate, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard" };

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  await requireUser();
  const sp = await searchParams;
  const filter = sp.filter ?? "all";

  const data = await getDashboardData();

  const { scoreDistribution, topDeficientControls, vendors: portfolio } = data;

  const filteredVendors = portfolio.filter((v) => {
    if (filter === "overdue") return v.overdueCount > 0;
    if (filter === "critical") return v.tier === "CRITICAL";
    if (filter === "high") return v.tier === "HIGH";
    if (filter === "unassessed")
      return v.overallScore === null && v.overdueCount === 0;
    return true;
  });

  const needingAttention = portfolio.filter((v) => v.overdueCount > 0);
  const allGood = filteredVendors.filter((v) => v.overdueCount === 0);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Vendor risk overview
          </h1>
          <p className="text-muted-foreground text-sm">
            {portfolio.length} vendor
            {portfolio.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/vendors/new">New vendor</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/assessments">Assessments</Link>
          </Button>
        </div>
      </div>

      {portfolio.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No vendors yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Add your first vendor to start tracking their risk.
            </p>
            <Link
              href="/vendors/new"
              className="text-primary mt-2 inline-block text-sm hover:underline"
            >
              Add a vendor →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-xs font-normal">
                  Vendors tracked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {data.vendorCount}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-xs font-normal">
                  Average score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {data.averageScore !== null
                    ? formatPercent(data.averageScore)
                    : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-xs font-normal">
                  Open findings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {data.openFindings}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-xs font-normal">
                  Needs attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {data.needsAttention}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <DashboardCharts scoreDistribution={scoreDistribution} />

          {/* Top deficient controls */}
          {topDeficientControls.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Top deficient controls</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {topDeficientControls.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-md border p-3"
                  >
                    <Badge variant="outline" className="shrink-0 font-mono">
                      {item.code}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {item.title}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {item.vendorCount} of {portfolio.length} vendors deficient
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {/* Vendors needing attention */}
          {needingAttention.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  Needs attention ({needingAttention.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col divide-y rounded-lg border">
                  {needingAttention.map((vendor) => (
                    <Link
                      key={vendor.id}
                      href={`/vendors/${vendor.id}`}
                      className="hover:bg-accent/40 flex items-center justify-between gap-4 p-3 transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {vendor.name}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {vendor.latestAssessmentTitle ?? "No assessments"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {vendor.overdueCount > 0 ? (
                          <Badge variant="destructive">
                            {vendor.overdueCount} overdue
                          </Badge>
                        ) : null}
                        <span className="text-muted-foreground text-sm font-semibold tabular-nums">
                          {vendor.overallScore !== null
                            ? formatPercent(vendor.overallScore)
                            : "—"}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Vendor list filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs">Filter:</span>
            {[
              { key: "all", label: "All" },
              { key: "overdue", label: "Overdue" },
              { key: "critical", label: "Critical" },
              { key: "high", label: "High" },
              { key: "unassessed", label: "Unassessed" },
            ].map(({ key, label }) => (
              <Button
                key={key}
                asChild
                variant={filter === key ? "default" : "outline"}
                size="sm"
              >
                <Link href={`/dashboard?filter=${key}`}>{label}</Link>
              </Button>
            ))}
          </div>

          {/* All vendors */}
          {filteredVendors.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No vendors match this filter.
            </p>
          ) : (
            <div className="flex flex-col divide-y rounded-lg border">
              {allGood.map((vendor) => (
                <Link
                  key={vendor.id}
                  href={`/vendors/${vendor.id}`}
                  className="hover:bg-accent/40 flex items-center justify-between gap-4 p-3 transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{vendor.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {vendor.latestAssessmentTitle ?? "No assessments"}
                      {vendor.latestAssessmentDate
                        ? ` · ${formatDate(vendor.latestAssessmentDate)}`
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {vendor.tier ? (
                      <Badge variant="outline">
                        {
                          VENDOR_TIER_LABELS[
                            vendor.tier as keyof typeof VENDOR_TIER_LABELS
                          ]
                        }
                      </Badge>
                    ) : null}
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        vendor.overallScore !== null
                          ? vendor.overallScore >= 0.85
                            ? "text-[var(--rag-green)]"
                            : vendor.overallScore >= 0.6
                              ? "text-[var(--rag-amber)]"
                              : "text-[var(--rag-red)]"
                          : "text-muted-foreground"
                      }`}
                    >
                      {vendor.overallScore !== null
                        ? formatPercent(vendor.overallScore)
                        : "—"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
