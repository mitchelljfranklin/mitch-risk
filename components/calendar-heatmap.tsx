"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ContributionDay = {
  date: string;
  count: number;
};

function getMaxCount(days: ContributionDay[]): number {
  return Math.max(1, ...days.map((d) => d.count));
}

function colorFor(count: number, max: number): string {
  if (count === 0) return "bg-muted";
  const ratio = count / max;
  if (ratio <= 0.25) return "bg-[var(--rag-green)]/20";
  if (ratio <= 0.5) return "bg-[var(--rag-green)]/40";
  if (ratio <= 0.75) return "bg-[var(--rag-green)]/60";
  return "bg-[var(--rag-green)]/80";
}

type CalendarHeatmapProps = {
  days: ContributionDay[];
};

export function CalendarHeatmap({ days }: CalendarHeatmapProps) {
  if (days.length === 0) return null;

  const max = getMaxCount(days);

  const weeks: ContributionDay[][] = [];
  let currentWeek: ContributionDay[] = [];

  for (const day of days) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const totalCount = days.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Assessment activity
        </CardTitle>
        <p className="text-muted-foreground text-xs">
          {totalCount} assessment{totalCount !== 1 ? "s" : ""} in the last year
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.count} assessment${day.count !== 1 ? "s" : ""}`}
                  className={`h-3 w-3 rounded-sm ${colorFor(day.count, max)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
