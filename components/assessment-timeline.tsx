"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
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

const TIME_RANGES = [
  { value: "90d", days: 90 },
  { value: "30d", days: 30 },
  { value: "7d", days: 7 },
] as const;

export function AssessmentTimeline({ days }: { days: Day[] }) {
  const translations = useTranslations("Dashboard.charts.activity");
  const dateFormatter = useFormatter();
  const [timeRange, setTimeRange] = useState("90d");

  const chartConfig = {
    assessments: {
      label: translations("assessments"),
      color: "var(--primary)",
    },
  };

  function formatChartDate(date: string): string {
    return dateFormatter.dateTime(new Date(date), {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  function formatChartTick(date: string): string {
    return dateFormatter.dateTime(new Date(date), {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  }

  const referenceDate = new Date(days[days.length - 1]?.date ?? "2026-01-01");
  const keepSince = new Date(referenceDate);
  const selectedRange =
    TIME_RANGES.find((range) => range.value === timeRange) ?? TIME_RANGES[0];
  keepSince.setDate(keepSince.getDate() - selectedRange.days);
  const sinceDate = keepSince.toISOString().slice(0, 10);

  const filteredData = days.filter((day) => day.date >= sinceDate);
  const firstDay = filteredData[0];
  const lastDay = filteredData[filteredData.length - 1];

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>{translations("title")}</CardTitle>
          <CardDescription>
            {firstDay && lastDay ? (
              <>
                {formatChartDate(firstDay.date)} —{" "}
                {formatChartDate(lastDay.date)}
              </>
            ) : (
              translations("noActivity")
            )}
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label={translations("timeRange")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {TIME_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {translations(`ranges.${range.value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
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
              tickFormatter={(value: string) => formatChartTick(value)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(labelValue: unknown) =>
                    formatChartTick(labelValue as string)
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
