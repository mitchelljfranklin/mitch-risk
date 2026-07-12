"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Day = { date: string; count: number };

const AREA_CONFIG = {
  assessments: {
    label: "Assessments",
    color: "var(--primary)",
  },
};

const TIME_RANGES = [
  { value: "90d", label: "Last 3 months", days: 90 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "7d", label: "Last 7 days", days: 7 },
] as const;

export function AssessmentTimeline({ days }: { days: Day[] }) {
  const [timeRange, setTimeRange] = useState("90d");

  const referenceDate = new Date(days[days.length - 1]?.date ?? "2026-01-01");
  const keepSince = new Date(referenceDate);
  const selectedRange =
    TIME_RANGES.find((range) => range.value === timeRange) ?? TIME_RANGES[0];
  keepSince.setDate(keepSince.getDate() - selectedRange.days);
  const sinceStr = keepSince.toISOString().slice(0, 10);

  const filteredData = days.filter((day) => day.date >= sinceStr);

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Assessment activity</CardTitle>
          <CardDescription>
            {filteredData.length > 0 ? (
              <>
                {filteredData[0]?.date} —{" "}
                {filteredData[filteredData.length - 1]?.date}
              </>
            ) : (
              "No activity in this period"
            )}
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Select a time range"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {TIME_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={AREA_CONFIG}
          className="aspect-auto h-[200px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillAssessments" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-assessments)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-assessments)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(labelValue: unknown) =>
                    new Date(labelValue as string).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="count"
              type="natural"
              fill="url(#fillAssessments)"
              stroke="var(--color-assessments)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
