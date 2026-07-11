"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type VendorEntry = { vendorId: string; vendorName: string };

type GroupConfig = {
  key: string;
  label: string;
  variant: "destructive" | "default";
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
];

type AttentionGroupsProps = {
  groups: Record<string, VendorEntry[]>;
};

export function AttentionGroups({ groups }: AttentionGroupsProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const totalItems = Object.values(groups).reduce(
    (sum, group) => sum + group.length,
    0,
  );

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
      <CardContent className="flex flex-col gap-1">
        {GROUPS.map((group) => {
          const items = groups[group.key];
          if (!items || items.length === 0) return null;
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
                  {items.length}
                </Badge>
              </button>
              {isExpanded ? (
                <div className="ml-6 flex flex-col divide-y rounded-md border">
                  {items.map((entry) => (
                    <Link
                      key={entry.vendorId}
                      href={`/vendors/${entry.vendorId}`}
                      className="hover:bg-accent/40 px-3 py-2 text-sm transition-colors"
                    >
                      {entry.vendorName}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
