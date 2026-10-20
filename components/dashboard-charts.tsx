"use client";

import { useTranslations } from "next-intl";
import {
  Cell,
  Pie,
  PieChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Label,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const GREEN_FILL = "var(--rag-green, #16a34a)";
const AMBER_FILL = "var(--rag-amber, #d97706)";
const RED_FILL = "var(--rag-red, #dc2626)";
const UNSCORED_FILL = "var(--rag-unscored, #9ca3af)";
const PRIMARY_FILL = "var(--primary)";
const MEDIUM_FILL = "color-mix(in oklab, var(--rag-amber) 65%, transparent)";

const STATUS_ROWS = [
  { key: "DRAFT", color: "var(--muted-foreground)" },
  { key: "SENT", color: PRIMARY_FILL },
  {
    key: "IN_PROGRESS",
    color: "color-mix(in oklab, var(--primary), transparent 40%)",
  },
  { key: "SUBMITTED", color: PRIMARY_FILL },
  {
    key: "UNDER_REVIEW",
    color: "color-mix(in oklab, var(--primary) 60%, var(--destructive) 40%)",
  },
  { key: "COMPLETED", color: "var(--success)" },
  { key: "OVERDUE", color: "var(--destructive)" },
] as const;

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
};

export function DashboardCharts({
  scoreDistribution,
  findingsBySeverity,
  riskByTier,
  assessmentStatusCounts,
}: ChartsProps) {
  const translations = useTranslations("Dashboard.charts");

  const donutConfig = {
    green: { label: translations("rag.green"), color: GREEN_FILL },
    amber: { label: translations("rag.amber"), color: AMBER_FILL },
    red: { label: translations("rag.red"), color: RED_FILL },
    unscored: { label: translations("rag.unscored"), color: UNSCORED_FILL },
  };

  const severityConfig = {
    value: { label: translations("openFindings"), color: RED_FILL },
  };

  const tierConfig = {
    green: { label: translations("ragShort.green"), color: GREEN_FILL },
    amber: { label: translations("ragShort.amber"), color: AMBER_FILL },
    red: { label: translations("ragShort.red"), color: RED_FILL },
    unscored: {
      label: translations("ragShort.unscored"),
      color: UNSCORED_FILL,
    },
  };

  const donutData = [
    { name: "green", value: scoreDistribution.green, fill: GREEN_FILL },
    { name: "amber", value: scoreDistribution.amber, fill: AMBER_FILL },
    { name: "red", value: scoreDistribution.red, fill: RED_FILL },
    {
      name: "unscored",
      value: scoreDistribution.unscored,
      fill: UNSCORED_FILL,
    },
  ].filter((datum) => datum.value > 0);

  const hasDonut = donutData.length >= 2;
  const totalVendors =
    scoreDistribution.green +
    scoreDistribution.amber +
    scoreDistribution.red +
    scoreDistribution.unscored;

  const severityData = [
    {
      name: translations("severity.CRITICAL"),
      value: findingsBySeverity.CRITICAL,
      fill: RED_FILL,
    },
    {
      name: translations("severity.HIGH"),
      value: findingsBySeverity.HIGH,
      fill: AMBER_FILL,
    },
    {
      name: translations("severity.MEDIUM"),
      value: findingsBySeverity.MEDIUM,
      fill: MEDIUM_FILL,
    },
    {
      name: translations("severity.LOW"),
      value: findingsBySeverity.LOW,
      fill: UNSCORED_FILL,
    },
  ];
  const hasSeverity = severityData.some((datum) => datum.value > 0);

  const statusDonutData = STATUS_ROWS.map((row) => ({
    name: translations(`status.${row.key}`),
    value: assessmentStatusCounts[row.key] ?? 0,
    fill: row.color,
  })).filter((datum) => datum.value > 0);
  const hasStatus = statusDonutData.length > 0;

  const tierData = riskByTier.map((row) => ({
    tier: translations.has(`tier.${row.tier}`)
      ? translations(`tier.${row.tier}`)
      : row.tier,
    green: row.green,
    amber: row.amber,
    red: row.red,
    unscored: row.unscored,
  }));
  const hasTier = tierData.length > 0;

  if (!hasDonut && !hasSeverity && !hasStatus && !hasTier) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
      {hasDonut ? (
        <Card>
          <CardHeader>
            <CardTitle>{translations("portfolioHealth")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={donutConfig}
              className="mx-auto aspect-square max-h-[250px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={5}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-3xl font-bold"
                            >
                              {totalVendors}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-muted-foreground"
                            >
                              {translations("vendors")}
                            </tspan>
                          </text>
                        );
                      }
                      return null;
                    }}
                  />
                  {donutData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs">
              {donutData.map((datum) => (
                <span key={datum.name} className="flex items-center gap-1">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: datum.fill }}
                  />
                  {donutConfig[datum.name as keyof typeof donutConfig]?.label}:
                  {datum.value}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {hasSeverity ? (
        <Card>
          <CardHeader>
            <CardTitle>{translations("openFindingsBySeverity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={severityConfig}>
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
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : null}

      {hasStatus ? (
        <Card>
          <CardHeader>
            <CardTitle>{translations("assessmentStatus")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ value: { label: translations("assessments") } }}
            >
              <BarChart
                data={statusDonutData}
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
                <Bar dataKey="value" radius={4} barSize={20}>
                  {statusDonutData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : null}

      {hasTier ? (
        <Card>
          <CardHeader>
            <CardTitle>{translations("riskByTier")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={tierConfig}>
              <BarChart
                data={tierData}
                layout="vertical"
                margin={{ left: 0, right: 20 }}
                barCategoryGap="30%"
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
            <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs">
              {(["green", "amber", "red", "unscored"] as const).map(
                (colorKey) => (
                  <span key={colorKey} className="flex items-center gap-1">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: tierConfig[colorKey].color }}
                    />
                    {tierConfig[colorKey].label}
                  </span>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
