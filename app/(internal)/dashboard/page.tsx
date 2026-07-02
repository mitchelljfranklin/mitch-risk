import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCharts } from "@/components/dashboard-charts";
import { StatCard, ScoreStatCard } from "@/components/stat-card";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getDashboardData } from "@/lib/db/compliance";
import { prisma } from "@/lib/prisma";
import { VENDOR_TIER_LABELS } from "@/lib/schemas/vendor";
import { formatDate, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard" };

function generateContributionDays(dates: Date[]) {
  const map = new Map<string, number>();
  for (const date of dates) {
    const key = date.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const result: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = 365; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: map.get(key) ?? 0 });
  }
  return result;
}

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const user = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
  const canCreateVendor = hasPermission(
    user.permissions,
    PERMISSIONS.VENDORS_CREATE,
  );
  const sp = await searchParams;
  const filter = sp.filter ?? "all";

  const data = await getDashboardData();

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const recentAssessments = await prisma.assessment.findMany({
    where: { createdAt: { gte: oneYearAgo }, status: { not: "DRAFT" } },
    select: { createdAt: true },
  });

  const contributionDays = generateContributionDays(
    recentAssessments.map((a) => a.createdAt),
  );

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
          {canCreateVendor ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/vendors/new">New vendor</Link>
            </Button>
          ) : null}
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
              {canCreateVendor
                ? "Add your first vendor to start tracking their risk."
                : "No vendors are being tracked yet."}
            </p>
            {canCreateVendor ? (
              <Link
                href="/vendors/new"
                className="text-primary mt-2 inline-block text-sm hover:underline"
              >
                Add a vendor →
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard label="Vendors tracked" value={data.vendorCount} />
            <ScoreStatCard label="Average score" score={data.averageScore} />
            <StatCard label="Open findings" value={data.openFindings} />
            <StatCard label="Needs attention" value={data.needsAttention} />
          </div>

          {/* Charts */}
          <DashboardCharts scoreDistribution={scoreDistribution} />

          <CalendarHeatmap days={contributionDays} />

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
