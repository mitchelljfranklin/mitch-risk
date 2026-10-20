"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/components/score-badge";

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
  type: "Certification" | "Contract" | "Reassessment";
  vendorId: string;
  vendorName: string;
  label: string;
  daysUntil: number;
  date: Date | string;
};

type GroupConfig = {
  key: string;
  variant: "destructive" | "default" | "outline";
  icon: React.ReactNode;
};

const GROUPS: GroupConfig[] = [
  {
    key: "overdue",
    variant: "destructive",
    icon: <AlertTriangle className="size-3.5" />,
  },
  {
    key: "belowThreshold",
    variant: "destructive",
    icon: <AlertTriangle className="size-3.5" />,
  },
  {
    key: "keyDates",
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
  const translations = useTranslations("Dashboard");
  const dateFormatter = useFormatter();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(groupKey: string) {
    setExpanded((previous) => ({
      ...previous,
      [groupKey]: !previous[groupKey],
    }));
  }

  function totalForGroup(groupKey: string): number {
    if (groupKey === "overdue") return overdueGroups.length;
    if (groupKey === "belowThreshold") return belowThresholdGroups.length;
    if (groupKey === "keyDates") return keyDates?.length ?? 0;
    return 0;
  }

  function renderOverdueEntries() {
    return overdueGroups.map((entry) => {
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
            <span className="truncate font-medium">{entry.vendorName}</span>
            <span className="text-muted-foreground truncate text-xs">
              {translations("attention.overdueAssessment", {
                count: entry.overdueCount,
              })}
              {entry.mostOverdueDate
                ? ` · ${translations("attention.oldestSince", {
                    date: dateFormatter.dateTime(entry.mostOverdueDate, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    }),
                  })}`
                : ""}
            </span>
          </div>
        </Link>
      );
    });
  }

  function renderBelowThresholdEntries() {
    return belowThresholdGroups.map((entry) => (
      <Link
        key={entry.vendorId}
        href={`/vendors/${entry.vendorId}`}
        className="hover:bg-accent/40 flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors"
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">{entry.vendorName}</span>
          <span className="text-muted-foreground text-xs">
            {translations("attention.belowThreshold", {
              percent: Math.round(amberThreshold * 100),
            })}
          </span>
        </div>
        {entry.score !== null ? (
          <ScoreBadge score={entry.score} size="sm" />
        ) : null}
      </Link>
    ));
  }

  function renderKeyDateEntries() {
    return (keyDates ?? []).map((entry) => {
      const isOverdue = entry.daysUntil < 0;
      const dateLabel =
        entry.type === "Contract"
          ? translations("attention.contractRenewal")
          : entry.label;
      return (
        <Link
          key={`${entry.vendorId}-${String(entry.date)}`}
          href={`/vendors/${entry.vendorId}`}
          className="hover:bg-accent/40 flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors"
        >
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{entry.vendorName}</span>
            <span className="text-muted-foreground truncate text-xs">
              {dateLabel} ·{" "}
              {dateFormatter.dateTime(new Date(entry.date), {
                day: "2-digit",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
              })}
            </span>
          </div>
          <span
            className={
              isOverdue
                ? "text-destructive shrink-0 text-xs font-medium"
                : "text-muted-foreground shrink-0 text-xs"
            }
          >
            {isOverdue
              ? translations("attention.daysOverdue", {
                  days: Math.abs(entry.daysUntil),
                })
              : translations("attention.inDays", { days: entry.daysUntil })}
          </span>
        </Link>
      );
    });
  }

  function renderGroupEntries(groupKey: string) {
    if (groupKey === "overdue") return renderOverdueEntries();
    if (groupKey === "belowThreshold") return renderBelowThresholdEntries();
    return renderKeyDateEntries();
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
          <CardTitle>{translations("attention.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {translations("attention.allClear")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {translations("attention.titleWithCount", { count: totalItems })}
        </CardTitle>
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
                  {translations("attention.unreviewed")}
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
                    ? translations("attention.clarification")
                    : translations("attention.clarifications")}
                </span>
              </Link>
            ) : null}
            {failedEmailCount > 0 ? (
              <Link
                href="/admin/email-tracking?status=FAILED"
                className="bg-muted hover:bg-accent inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors"
              >
                <span className="font-medium">{failedEmailCount}</span>
                <span className="text-muted-foreground">
                  {failedEmailCount === 1
                    ? translations("attention.failedEmail")
                    : translations("attention.failedEmails")}
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
                  <span className="text-sm font-medium">
                    {translations(`attention.groups.${group.key}`)}
                  </span>
                </span>
                <Badge variant={group.variant} className="ml-auto text-xs">
                  {count}
                </Badge>
              </button>
              {isExpanded ? (
                <div className="ml-6 flex flex-col divide-y rounded-md border">
                  {renderGroupEntries(group.key)}
                </div>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
