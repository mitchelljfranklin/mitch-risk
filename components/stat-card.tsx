"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function useCountUp(end: number, durationMs = 800) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (end <= 0) {
      return;
    }

    const start = performance.now();
    let frame: number;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(progress < 1 ? Math.round(eased * end) : end);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [end, durationMs]);

  return end <= 0 ? end : value;
}

type StatCardProps = {
  label: string;
  value: number;
  suffix?: string;
  format?: "number" | "percent";
  colorClass?: string;
  trend?: "up" | "down" | "stable";
  sparklineData?: number[];
};

export function StatCard({
  label,
  value,
  suffix,
  format = "number",
  colorClass,
  trend,
  sparklineData,
}: StatCardProps) {
  const animated = useCountUp(value);
  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : null;
  const trendColor =
    trend === "up"
      ? "text-[var(--rag-green)]"
      : trend === "down"
        ? "text-[var(--rag-red)]"
        : "";

  const display =
    format === "percent"
      ? `${animated}%`
      : suffix
        ? `${animated} ${suffix}`
        : String(animated);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-xs font-normal">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p
          className={`text-2xl font-semibold tabular-nums ${colorClass ?? ""}`}
        >
          {display}
          {trendIcon ? (
            <span className={`ml-1 text-sm ${trendColor}`}>{trendIcon}</span>
          ) : null}
        </p>
        {sparklineData && sparklineData.length > 1 ? (
          <svg
            className="h-8 w-full"
            viewBox={`0 0 ${sparklineData.length - 1} 20`}
            preserveAspectRatio="none"
          >
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-primary/50"
              points={sparklineData
                .map(
                  (point, index) =>
                    `${index},${20 - (point / Math.max(...sparklineData)) * 18}`,
                )
                .join(" ")}
            />
          </svg>
        ) : null}
      </CardContent>
    </Card>
  );
}

type ScoreStatCardProps = {
  label: string;
  score: number | null;
  trend?: "up" | "down" | "stable";
  sparklineData?: number[];
};

export function ScoreStatCard({
  label,
  score,
  trend,
  sparklineData,
}: ScoreStatCardProps) {
  const numericScore = score !== null ? Math.round(score * 100) : 0;
  const animated = useCountUp(numericScore);

  const colorClass =
    score !== null
      ? score >= 0.85
        ? "text-[var(--rag-green)]"
        : score >= 0.6
          ? "text-[var(--rag-amber)]"
          : "text-[var(--rag-red)]"
      : "text-muted-foreground";

  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : null;
  const trendColor =
    trend === "up"
      ? "text-[var(--rag-green)]"
      : trend === "down"
        ? "text-[var(--rag-red)]"
        : "";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-xs font-normal">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className={`text-2xl font-semibold tabular-nums ${colorClass}`}>
          {score !== null ? `${animated}%` : "—"}
          {trendIcon ? (
            <span className={`ml-1 text-sm ${trendColor}`}>{trendIcon}</span>
          ) : null}
        </p>
        {sparklineData && sparklineData.length > 1 ? (
          <svg
            className="h-8 w-full"
            viewBox={`0 0 ${sparklineData.length - 1} 20`}
            preserveAspectRatio="none"
          >
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="opacity-50"
              points={sparklineData
                .map(
                  (point, index) =>
                    `${index},${20 - (point / Math.max(...sparklineData)) * 18}`,
                )
                .join(" ")}
            />
          </svg>
        ) : null}
      </CardContent>
    </Card>
  );
}
