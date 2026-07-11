import Link from "next/link";
import dynamicImport from "next/dynamic";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, ScoreStatCard } from "@/components/stat-card";
import { AttentionGroups } from "@/components/attention-groups";
import { ScoreBadge } from "@/components/score-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getDashboardData } from "@/lib/db/compliance";
import { getFindingSummary } from "@/lib/db/findings";
import { listUpcomingKeyDates } from "@/lib/db/dashboard";
import { getNotificationCounts } from "@/lib/db/notifications";
import { prisma } from "@/lib/prisma";
import { VENDOR_TIER_LABELS } from "@/lib/schemas/vendor";
import { formatDate } from "@/lib/utils";

const DashboardCharts = dynamicImport(
  () =>
    import("@/components/dashboard-charts").then((mod) => ({
      default: mod.DashboardCharts,
    })),
  {
    loading: () => (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-[300px] w-full rounded-lg" />
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>
    ),
  },
);

const AssessmentTimeline = dynamicImport(
  () =>
    import("@/components/assessment-timeline").then((mod) => ({
      default: mod.AssessmentTimeline,
    })),
  {
    loading: () => <Skeleton className="h-[200px] w-full rounded-lg" />,
  },
);

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
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    result.push({ date: key, count: map.get(key) ?? 0 });
  }
  return result;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const canCreateVendor = hasPermission(
    user.permissions,
    PERMISSIONS.VENDORS_CREATE,
  );

  const [data, findingSummary, upcoming, notificationCounts] =
    await Promise.all([
      getDashboardData(),
      getFindingSummary(),
      listUpcomingKeyDates(60),
      getNotificationCounts(),
    ]);

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const recentAssessments = await prisma.assessment.findMany({
    where: { createdAt: { gte: oneYearAgo }, status: { not: "DRAFT" } },
    select: { createdAt: true },
  });

  const contributionDays = generateContributionDays(
    recentAssessments.map((assessment) => assessment.createdAt),
  );

  const {
    scoreDistribution,
    topDeficientControls,
    vendors: portfolio,
    vendorTrend,
    findingTrend,
    scoreTrend,
    portfolioScoreTrend,
    attentionGroups,
  } = data;

  const RAIL_LIST_LIMIT = 5;
  const VENDOR_LIST_LIMIT = 6;

  // Highest-risk snapshot: lowest scores first, unassessed vendors last.
  const topRiskVendors = [...portfolio]
    .sort((a, b) => (a.overallScore ?? Infinity) - (b.overallScore ?? Infinity))
    .slice(0, VENDOR_LIST_LIMIT);

  return (
    <div className="flex flex-col gap-6">
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
          <Button asChild variant="outline" size="sm">
            <a href="/api/dashboard/report" download>
              Portfolio report
            </a>
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
            <StatCard
              label="Vendors tracked"
              value={data.vendorCount}
              trend={vendorTrend}
            />
            <ScoreStatCard
              label="Average score"
              score={data.averageScore}
              trend={scoreTrend}
              sparklineData={portfolioScoreTrend}
            />
            <StatCard
              label="Open findings"
              value={data.openFindings}
              trend={findingTrend}
            />
            <StatCard label="Needs attention" value={data.needsAttention} />
          </div>

          {/* Charts */}
          <DashboardCharts
            scoreDistribution={scoreDistribution}
            findingsBySeverity={findingSummary.openBySeverity}
            riskByTier={data.riskByTier}
            assessmentStatusCounts={data.assessmentStatusCounts}
          />

          {/* Insight rail: actionable lists side-by-side */}
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <AttentionGroups
              overdueGroups={attentionGroups.overdue}
              belowThresholdGroups={attentionGroups.belowThreshold}
              keyDates={upcoming}
              amberThreshold={attentionGroups.amberThreshold}
              unreviewedCount={notificationCounts.unreviewedSubmissions}
              clarificationCount={
                notificationCounts.clarificationsAwaitingVendor
              }
              failedEmailCount={notificationCounts.failedEmails}
            />

            {topDeficientControls.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Top deficient controls</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {topDeficientControls
                    .slice(0, RAIL_LIST_LIMIT)
                    .map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-md border p-2"
                      >
                        <Badge
                          variant="outline"
                          className="shrink-0 font-mono text-xs"
                        >
                          {item.code}
                        </Badge>
                        <span className="min-w-0 flex-1 truncate text-xs">
                          {item.title}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                          {item.vendorCount}/{portfolio.length}
                        </span>
                      </div>
                    ))}
                  <Link
                    href="/risk-register"
                    className="text-muted-foreground hover:text-primary mt-1 inline-block text-xs"
                  >
                    View risk register →
                  </Link>
                </CardContent>
              </Card>
            ) : null}

            {/* Highest-risk vendors (compact) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle>Highest-risk vendors</CardTitle>
                <Link
                  href="/vendors"
                  className="text-muted-foreground hover:text-primary text-xs font-normal"
                >
                  View all vendors →
                </Link>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col divide-y rounded-lg border">
                  {topRiskVendors.map((vendor) => (
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
                          {vendor.latestAssessmentTitle ?? "No assessments"}
                          {vendor.latestAssessmentDate
                            ? ` · ${formatDate(vendor.latestAssessmentDate)}`
                            : ""}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {vendor.overdueCount > 0 ? (
                          <Badge variant="destructive">
                            {vendor.overdueCount} overdue
                          </Badge>
                        ) : vendor.tier ? (
                          <Badge variant="outline">
                            {
                              VENDOR_TIER_LABELS[
                                vendor.tier as keyof typeof VENDOR_TIER_LABELS
                              ]
                            }
                          </Badge>
                        ) : null}
                        <ScoreBadge score={vendor.overallScore} size="sm" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assessment activity */}
          <AssessmentTimeline days={contributionDays} />
        </>
      )}
    </div>
  );
}
