"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProgressBar } from "@/components/progress-bar";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  NOT_APPLICABLE: "N/A",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING:
    "bg-[var(--rag-amber)] text-black",
  IN_PROGRESS:
    "bg-blue-600 text-white",
  COMPLETED:
    "bg-[var(--rag-green)] text-white",
  NOT_APPLICABLE:
    "bg-gray-400 text-white",
};

type ActionView = {
  id: string;
  controlCode: string;
  controlTitle: string;
  status: string;
  assignedToName: string | null;
  notes: string | null;
  completedAt: Date | null;
};

type CertGroup = {
  certificationName: string;
  certificationId: string | null;
  actions: ActionView[];
};

export function CustomerResponsibilityChecklist({
  groups,
}: {
  groups: CertGroup[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <ChecklistCard key={group.certificationId ?? "unlinked"} group={group} />
      ))}
    </div>
  );
}

function ChecklistCard({ group }: { group: CertGroup }) {
  const [expanded, setExpanded] = useState(true);
  const total = group.actions.length;
  const completed = group.actions.filter(
    (action) => action.status === "COMPLETED" || action.status === "NOT_APPLICABLE",
  ).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card>
      <CardHeader
        className="cursor-pointer pb-2"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Customer Responsibility
            {group.certificationName ? (
              <span className="text-muted-foreground text-sm font-normal">
                {" "}
                ({group.certificationName})
              </span>
            ) : null}
          </CardTitle>
          <span className="text-muted-foreground text-xs">
            {completed} of {total} · {percent}%
          </span>
        </div>
        <ProgressBar
          value={percent}
          className={cn(
            percent >= 100
              ? "[&>div]:bg-[var(--rag-green)]"
              : percent >= 50
                ? "[&>div]:bg-[var(--rag-amber)]"
                : "[&>div]:bg-[var(--rag-red)]",
          )}
        />
      </CardHeader>
      {expanded ? (
        <CardContent className="pt-0">
          {total === 0 ? (
            <p className="text-muted-foreground text-sm">
              No shared-responsibility controls for this certification.
            </p>
          ) : (
            <div className="flex flex-col divide-y rounded-md border">
              {group.actions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="flex min-w-0 flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground text-xs font-mono">
                        {action.controlCode}
                      </span>
                      <span className="truncate text-sm">
                        {action.controlTitle}
                      </span>
                    </div>
                    {action.assignedToName ? (
                      <span className="text-muted-foreground text-xs">
                        Assigned to {action.assignedToName}
                      </span>
                    ) : null}
                  </div>
                  <Badge
                    className={cn(
                      "shrink-0",
                      STATUS_STYLES[action.status] ?? STATUS_STYLES.PENDING,
                    )}
                  >
                    {STATUS_LABELS[action.status] ?? action.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}
