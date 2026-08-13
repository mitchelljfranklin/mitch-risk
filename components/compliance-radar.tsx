"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type DomainRadarPoint } from "@/lib/db/compliance";

const CURRENT_COLOR = "var(--primary)";
const PREVIOUS_COLOR = "var(--muted-foreground)";

const RADAR_CONFIG = {
  current: { label: "Current assessment", color: CURRENT_COLOR },
  previous: { label: "Previous assessment", color: PREVIOUS_COLOR },
};

type ComplianceRadarProps = {
  data: DomainRadarPoint[];
  hasPrevious: boolean;
};

export function ComplianceRadar({ data, hasPrevious }: ComplianceRadarProps) {
  if (data.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Domain compliance radar</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={RADAR_CONFIG}
          className="mx-auto aspect-square max-h-[360px]"
        >
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid />
            <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis
              domain={[0, 100]}
              tickCount={5}
              axisLine={false}
              tick={{ fontSize: 10 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="line"
                  formatter={(value) =>
                    value === null || value === undefined
                      ? "—"
                      : `${String(value)}%`
                  }
                />
              }
            />
            <Radar
              name="current"
              dataKey="current"
              stroke={CURRENT_COLOR}
              fill={CURRENT_COLOR}
              fillOpacity={0.3}
            />
            {hasPrevious ? (
              <Radar
                name="previous"
                dataKey="previous"
                stroke={PREVIOUS_COLOR}
                fill={PREVIOUS_COLOR}
                fillOpacity={0.2}
              />
            ) : null}
          </RadarChart>
        </ChartContainer>
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs">
          {(["current", "previous"] as const)
            .filter((key) => key === "current" || hasPrevious)
            .map((key) => (
              <span key={key} className="flex items-center gap-1">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: RADAR_CONFIG[key].color }}
                />
                {RADAR_CONFIG[key].label}
              </span>
            ))}
        </div>
        {!hasPrevious ? (
          <p className="text-muted-foreground mt-2 text-center text-xs">
            Only one completed assessment — no previous data to compare.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
