"use client";

import { Cell, Pie, PieChart, Bar, BarChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DONUT_CONFIG = {
  green: { label: "Green (≥85%)", color: "var(--color-green, #16a34a)" },
  amber: { label: "Amber (60–84%)", color: "var(--color-amber, #d97706)" },
  red: { label: "Red (<60%)", color: "var(--color-red, #dc2626)" },
  unscored: { label: "Unscored", color: "var(--color-unscored, #9ca3af)" },
};

const BAR_CONFIG = {
  vendors: { label: "Vendors", color: "var(--primary, #3b82f6)" },
};

const GREEN_FILL = "var(--color-green, #16a34a)";
const AMBER_FILL = "var(--color-amber, #d97706)";
const RED_FILL = "var(--color-red, #dc2626)";
const UNSCORED_FILL = "var(--color-unscored, #9ca3af)";

type ChartsProps = {
  scoreDistribution: {
    green: number;
    amber: number;
    red: number;
    unscored: number;
  };
};

export function DashboardCharts({ scoreDistribution }: ChartsProps) {
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

  const barData = [
    { name: "Green", value: scoreDistribution.green, fill: GREEN_FILL },
    { name: "Amber", value: scoreDistribution.amber, fill: AMBER_FILL },
    { name: "Red", value: scoreDistribution.red, fill: RED_FILL },
    {
      name: "Unscored",
      value: scoreDistribution.unscored,
      fill: UNSCORED_FILL,
    },
  ];

  const hasDonut = donutData.length >= 2;
  const hasBar = barData.some((d) => d.value > 0);

  if (!hasDonut && !hasBar) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {hasDonut ? (
        <Card>
          <CardHeader>
            <CardTitle>Portfolio health</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={DONUT_CONFIG}>
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {donutData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
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
      {hasBar ? (
        <Card>
          <CardHeader>
            <CardTitle>Score distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={BAR_CONFIG}>
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ left: 0, right: 20 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  width={65}
                />
                <Bar dataKey="value" radius={4} barSize={20}>
                  {barData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
