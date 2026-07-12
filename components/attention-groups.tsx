"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/components/score-badge";
import { formatDate } from "@/lib/utils";

type OverdueEntry = {
  vendorId: string;
  vendorName: string;
  overdueCount: number;
  mostOverdueAssessmentId: string | null;
  mostOverdueDate: Date | null;
};

type BelowThresholdEntry = {
  vendorId: string;
  vendorName: string;
  score: number | null;
};

type KeyDateEntry = {
  vendorId: string;
  vendorName: string;
  label: string;
  daysUntil: number;
  date: Date | string;
};

type GroupConfig = {
  key: string;
  label: string;
  variant: "destructive" | "default" | "outline";
  icon: React.ReactNode;
};

const GROUPS: GroupConfig[] = [
  {
    key: "overdue",
    label: "Overdue assessments",
    variant: "destructive",
    icon: <AlertTriangle className="size-3.5" />,
  },
  {
    key: "belowThreshold",
    label: "Below score threshold",
    variant: "destructive",
    icon: <AlertTriangle className="size-3.5" />,
  },
  {
    key: "keyDates",
    label: "Key dates (60 days)",
    variant: "outline",
    icon: <Calendar className="size-3.5" />,
  },
];

type AttentionGroupsProps = {
  overdueGroups: OverdueEntry[];
  belowThresholdGroups: BelowThresholdEntry[];
  keyDates?: KeyDateEntry[];
  amberThreshold: number;
  unreviewedCount: number;
  clarificationCount: number;
  failedEmailCount: number;
};

export function AttentionGroups({
  overdueGroups,
  belowThresholdGroups,
  keyDates,
  amberThreshold,
  unreviewedCount,
  clarificationCount,
  failedEmailCount,
}: AttentionGroupsProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function totalForGroup(key: string): number {
    if (key === "overdue") return overdueGroups.length;
    if (key === "belowThreshold") return belowThresholdGroups.length;
    if (key === "keyDates") return keyDates?.length ?? 0;
    return 0;
  }

  const summaryTotal = unreviewedCount + clarificationCount + failedEmailCount;
  const groupTotal = GROUPS.reduce(
    (sum, group) => sum + totalForGroup(group.key),
    0,
  );
  const totalItems = summaryTotal + groupTotal;

  if (totalItems === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Needs attention</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            All clear — nothing needs attention right now.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs attention ({totalItems})</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {summaryTotal > 0 ? (
          <div className="flex flex-wrap gap-2">
            {unreviewedCount > 0 ? (
              <Link
                href="/assessments?status=SUBMITTED"
                className="bg-muted hover:bg-accent inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors"
              >
                <AlertTriangle className="size-3" />
                <span className="font-medium">{unreviewedCount}</span>
                <span className="text-muted-foreground">
                  {unreviewedCount === 1 ? "unreviewed" : "unreviewed"}
                </span>
              </Link>
            ) : null}
            {clarificationCount > 0 ? (
              <Link
                href="/assessments"
                className="bg-muted hover:bg-accent inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors"
              >
                <span className="font-medium">{clarificationCount}</span>
                <span className="text-muted-foreground">
                  {clarificationCount === 1
                    ? "clarification"
                    : "clarifications"}
                </span>
              </Link>
            ) : null}
            {failedEmailCount > 0 ? (
              <Link
                href="/settings?tab=email-tracking&status=FAILED"
                className="bg-muted hover:bg-accent inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors"
              >
                <span className="font-medium">{failedEmailCount}</span>
                <span className="text-muted-foreground">
                  failed email
                  {failedEmailCount !== 1 ? "s" : ""} (24h)
                </span>
              </Link>
            ) : null}
          </div>
        ) : null}
        {GROUPS.map((group) => {
          const count = totalForGroup(group.key);
          if (count === 0) return null;
          const isExpanded = expanded[group.key] ?? false;

          return (
            <div key={group.key}>
              <button
                type="button"
                onClick={() => toggle(group.key)}
                className="hover:bg-accent/40 flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
                )}
                <span className="flex items-center gap-1.5">
                  <span
                    className={
                      group.variant === "destructive" ? "text-destructive" : ""
                    }
                  >
                    {group.icon}
                  </span>
                  <span className="text-sm font-medium">{group.label}</span>
                </span>
                <Badge variant={group.variant} className="ml-auto text-xs">
                  {count}
                </Badge>
              </button>
              {isExpanded ? (
                <div className="ml-6 flex flex-col divide-y rounded-md border">
                  {group.key === "overdue"
                    ? overdueGroups.map((entry) => {
                        const href = entry.mostOverdueAssessmentId
                          ? `/assessments/${entry.mostOverdueAssessmentId}`
                          : `/vendors/${entry.vendorId}?tab=assessments`;
                        return (
                          <Link
                            key={entry.vendorId}
                            href={href}
                            className="hover:bg-accent/40 flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors"
                          >
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate font-medium">
                                {entry.vendorName}
                              </span>
                              <span className="text-muted-foreground truncate text-xs">
                                {entry.overdueCount === 1
                                  ? "1 overdue assessment"
                                  : `${entry.overdueCount} overdue assessments`}
                                {entry.mostOverdueDate
                                  ? ` · oldest since ${formatDate(entry.mostOverdueDate)}`
                                  : ""}
                              </span>
                            </div>
                          </Link>
                        );
                      })
                    : group.key === "belowThreshold"
                      ? belowThresholdGroups.map((entry) => (
                          <Link
                            key={entry.vendorId}
                            href={`/vendors/${entry.vendorId}`}
                            className="hover:bg-accent/40 flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors"
                          >
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate font-medium">
                                {entry.vendorName}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                below {Math.round(amberThreshold * 100)}%
                                threshold
                              </span>
                            </div>
                            {entry.score !== null ? (
                              <ScoreBadge score={entry.score} size="sm" />
                            ) : null}
                          </Link>
                        ))
                      : keyDates?.map((entry, _index) => {
                          const overdue = entry.daysUntil < 0;
                          return (
                            <Link
                              key={`${entry.vendorId}-${String(entry.date)}`}
                              href={`/vendors/${entry.vendorId}`}
                              className="hover:bg-accent/40 flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors"
                            >
                              <div className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate font-medium">
                                  {entry.vendorName}
                                </span>
                                <span className="text-muted-foreground truncate text-xs">
                                  {entry.label} · {formatDate(entry.date)}
                                </span>
                              </div>
                              <span
                                className={`shrink-0 text-xs ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}
                              >
                                {overdue
                                  ? `${Math.abs(entry.daysUntil)}d overdue`
                                  : `in ${entry.daysUntil}d`}
                              </span>
                            </Link>
                          );
                        })}
                </div>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
