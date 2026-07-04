"use client";

import {
  Cell,
  Pie,
  PieChart,
  Bar,
  BarChart,
  RadialBar,
  RadialBarChart,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DONUT_CONFIG = {
  green: { label: "Green (≥85%)", color: "var(--rag-green, #16a34a)" },
  amber: { label: "Amber (60–84%)", color: "var(--rag-amber, #d97706)" },
  red: { label: "Red (<60%)", color: "var(--rag-red, #dc2626)" },
  unscored: { label: "Unscored", color: "var(--rag-unscored, #9ca3af)" },
};

const BAR_CONFIG = {
  vendors: { label: "Vendors", color: "var(--primary, #3b82f6)" },
};

const GREEN_FILL = "var(--rag-green, #16a34a)";
const AMBER_FILL = "var(--rag-amber, #d97706)";
const RED_FILL = "var(--rag-red, #dc2626)";
const UNSCORED_FILL = "var(--rag-unscored, #9ca3af)";
const PRIMARY_FILL = "var(--primary, #3b82f6)";

const SEVERITY_CONFIG = {
  value: { label: "Open findings", color: RED_FILL },
};
const SEVERITY_FILLS: Record<string, string> = {
  Critical: RED_FILL,
  High: AMBER_FILL,
  Medium: "color-mix(in oklab, var(--rag-amber) 65%, transparent)",
  Low: UNSCORED_FILL,
};
const STATUS_CONFIG = {
  draft: { label: "Draft", color: "var(--muted-foreground, #9ca3af)" },
  sent: { label: "Sent", color: "var(--primary, #3b82f6)" },
  inProgress: {
    label: "In progress",
    color: "color-mix(in oklab, var(--primary), #60a5fa 40%)",
  },
  submitted: { label: "Submitted", color: "var(--rag-amber, #d97706)" },
  underReview: {
    label: "Under review",
    color: "color-mix(in oklab, var(--rag-amber) 60%, var(--rag-red) 40%)",
  },
  completed: { label: "Completed", color: "var(--rag-green, #16a34a)" },
  overdue: { label: "Overdue", color: "var(--rag-red, #dc2626)" },
};

const TIER_CONFIG = {
  green: { label: "Green", color: GREEN_FILL },
  amber: { label: "Amber", color: AMBER_FILL },
  red: { label: "Red", color: RED_FILL },
  unscored: { label: "Unscored", color: UNSCORED_FILL },
};

type RiskByTierRow = {
  tier: string;
  green: number;
  amber: number;
  red: number;
  unscored: number;
};

type ChartsProps = {
  scoreDistribution: {
    green: number;
    amber: number;
    red: number;
    unscored: number;
  };
  findingsBySeverity: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  riskByTier: RiskByTierRow[];
  assessmentStatusCounts: Record<string, number>;
  vendorsByTier?: Record<string, number>;
};

const TIER_LABELS: Record<string, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  Unspecified: "Unspecified",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  COMPLETED: "Completed",
  OVERDUE: "Overdue",
};

export function DashboardCharts({
  scoreDistribution,
  findingsBySeverity,
  riskByTier,
  assessmentStatusCounts,
  vendorsByTier,
}: ChartsProps) {
  const donutData = [
    { name: "green", value: scoreDistribution.green, fill: GREEN_FILL },
    { name: "amber", value: scoreDistribution.amber, fill: AMBER_FILL },
    { name: "red", value: scoreDistribution.red, fill: RED_FILL },
    {
      name: "unscored",
      value: scoreDistribution.unscored,
      fill: UNSCORED_FILL,
    },
  ].filter((d) => d.value > 0);

  const hasDonut = donutData.length >= 2;

  const severityData = [
    { name: "Critical", value: findingsBySeverity.CRITICAL },
    { name: "High", value: findingsBySeverity.HIGH },
    { name: "Medium", value: findingsBySeverity.MEDIUM },
    { name: "Low", value: findingsBySeverity.LOW },
  ];
  const hasSeverity = severityData.some((d) => d.value > 0);

  const radialChartConfig = {
    value: { label: "Assessments" },
    ...Object.fromEntries(
      Object.entries(STATUS_CONFIG).map(([key, entry]) => [
        key,
        { label: entry.label, color: entry.color },
      ]),
    ),
  };

  const statusDonutData = Object.keys(STATUS_LABELS)
    .map((key) => {
      const configKey = key.toLowerCase().replace(/_/g, "");
      const camelKey =
        configKey === "inprogress"
          ? "inProgress"
          : configKey === "underreview"
            ? "underReview"
            : configKey;
      const statusConfig =
        STATUS_CONFIG[camelKey as keyof typeof STATUS_CONFIG];
      return {
        name: STATUS_LABELS[key],
        value: assessmentStatusCounts[key] ?? 0,
        fill: statusConfig?.color ?? PRIMARY_FILL,
      };
    })
    .filter((d) => d.value > 0);
  const hasStatus = statusDonutData.length > 0;

  const tierData = riskByTier.map((row) => ({
    tier: TIER_LABELS[row.tier] ?? row.tier,
    green: row.green,
    amber: row.amber,
    red: row.red,
    unscored: row.unscored,
  }));
  const hasTier = tierData.length > 0;

  const VENDOR_TIER_ORDER = [
    "CRITICAL",
    "HIGH",
    "MEDIUM",
    "LOW",
    "Unspecified",
  ] as const;

  const vendorTierData = VENDOR_TIER_ORDER.map((tier) => ({
    name: TIER_LABELS[tier] ?? tier,
    value: vendorsByTier?.[tier] ?? 0,
  })).filter((d) => d.value > 0);
  const hasVendorsByTier = vendorTierData.length > 0;

  if (
    !hasDonut &&
    !hasSeverity &&
    !hasStatus &&
    !hasTier &&
    !hasVendorsByTier
  ) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
      {hasDonut ? (
        <Card>
          <CardHeader>
            <CardTitle>Portfolio health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-[7/4]">
              <ChartContainer config={DONUT_CONFIG}>
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs">
              {donutData.map((d) => (
                <span key={d.name} className="flex items-center gap-1">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: d.fill }}
                  />
                  {DONUT_CONFIG[d.name as keyof typeof DONUT_CONFIG]?.label}:{" "}
                  {d.value}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {hasSeverity ? (
        <Card>
          <CardHeader>
            <CardTitle>Open findings by severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-[7/4]">
              <ChartContainer config={SEVERITY_CONFIG}>
                <BarChart
                  data={severityData}
                  layout="vertical"
                  margin={{ left: 0, right: 20 }}
                >
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                    width={65}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={4} barSize={20}>
                    {severityData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={SEVERITY_FILLS[entry.name] ?? RED_FILL}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {hasStatus ? (
        <Card>
          <CardHeader>
            <CardTitle>Assessment status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-[7/4]">
              <ChartContainer config={radialChartConfig}>
                <RadialBarChart
                  data={statusDonutData}
                  startAngle={-90}
                  endAngle={380}
                  innerRadius={30}
                  outerRadius={110}
                >
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <RadialBar dataKey="value" background>
                    <LabelList
                      position="insideStart"
                      dataKey="name"
                      className="fill-background text-xs"
                    />
                  </RadialBar>
                </RadialBarChart>
              </ChartContainer>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs">
              {statusDonutData.map((d) => (
                <span key={d.name} className="flex items-center gap-1">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: d.fill }}
                  />
                  {d.name}: {d.value}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {hasTier ? (
        <Card>
          <CardHeader>
            <CardTitle>Risk by tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-[7/4]">
              <ChartContainer config={TIER_CONFIG}>
                <BarChart
                  data={tierData}
                  layout="vertical"
                  margin={{ left: 0, right: 20 }}
                >
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="tier"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                    width={80}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="green" stackId="t" fill={GREEN_FILL} />
                  <Bar dataKey="amber" stackId="t" fill={AMBER_FILL} />
                  <Bar dataKey="red" stackId="t" fill={RED_FILL} />
                  <Bar
                    dataKey="unscored"
                    stackId="t"
                    fill={UNSCORED_FILL}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs">
              {(["green", "amber", "red", "unscored"] as const).map((key) => (
                <span key={key} className="flex items-center gap-1">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: TIER_CONFIG[key].color }}
                  />
                  {TIER_CONFIG[key].label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {hasVendorsByTier ? (
        <Card>
          <CardHeader>
            <CardTitle>Vendors by tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-[7/4]">
              <ChartContainer config={BAR_CONFIG}>
                <BarChart
                  data={vendorTierData}
                  layout="vertical"
                  margin={{ left: 0, right: 20 }}
                >
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                    width={80}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="value"
                    radius={4}
                    barSize={18}
                    fill={PRIMARY_FILL}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
