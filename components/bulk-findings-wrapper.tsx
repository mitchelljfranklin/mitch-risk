"use client";

import { useState } from "react";
import { useActionState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { FindingStatusForm } from "@/app/(internal)/assessments/[assessmentId]/finding-status-form";
import { ControlCodePills } from "@/components/control-code-pills";
import {
  FINDING_STATUS_LABELS,
  FINDING_STATUS_STYLES,
  SEVERITY_ACCENT,
  SEVERITY_STYLES,
} from "@/lib/schemas/assessment";
import { formatDate } from "@/lib/utils";
import { bulkUpdateFindingStatusesAction } from "@/lib/actions/findings";
import type { RegisterFinding } from "@/lib/db/findings";

type BulkFindingsWrapperProps = {
  findings: RegisterFinding[];
  canReview: boolean;
};

export function BulkFindingsWrapper({
  findings,
  canReview,
}: BulkFindingsWrapperProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetStatus, setTargetStatus] = useState("REMEDIATED");
  const [state, bulkAction, isPending] = useActionState(
    bulkUpdateFindingStatusesAction,
    undefined,
  );
  useActionFeedback(state);

  function toggleSelection(findingId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(findingId)) {
        next.delete(findingId);
      } else {
        next.add(findingId);
      }
      return next;
    });
  }

  const selectedCount = selected.size;

  return (
    <div className="flex flex-col gap-3">
      {canReview && selectedCount > 0 ? (
        <div className="bg-accent/40 sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-lg border p-3">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <Select value={targetStatus} onValueChange={setTargetStatus}>
            <SelectTrigger className="w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="REMEDIATED">Remediated</SelectItem>
              <SelectItem value="RISK_ACCEPTED">Risk accepted</SelectItem>
              <SelectItem value="OPEN">Reopen</SelectItem>
            </SelectContent>
          </Select>
          <form id="bulk-findings-form" action={bulkAction}>
            <input
              type="hidden"
              name="findingIds"
              value={JSON.stringify([...selected])}
            />
            <input type="hidden" name="status" value={targetStatus} />
            <ConfirmDialog
              title={`Update ${selectedCount} finding${selectedCount !== 1 ? "s" : ""}?`}
              description={`Set ${selectedCount} finding${selectedCount !== 1 ? "s" : ""} to "${FINDING_STATUS_LABELS[targetStatus] ?? targetStatus}".`}
              confirmLabel="Apply"
              formId="bulk-findings-form"
            >
              <Button type="button" size="sm" disabled={isPending}>
                {isPending ? "Applying..." : "Apply"}
              </Button>
            </ConfirmDialog>
          </form>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
            disabled={isPending}
          >
            Clear selection
          </Button>
        </div>
      ) : null}

      {findings.map((finding) => (
        <Card
          key={finding.id}
          className={SEVERITY_ACCENT[finding.severity] ?? ""}
        >
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                {canReview ? (
                  <Checkbox
                    checked={selected.has(finding.id)}
                    onCheckedChange={() => toggleSelection(finding.id)}
                    className="mt-1"
                  />
                ) : null}
                <div className="flex min-w-0 flex-col gap-1">
                  <CardTitle className="text-base">{finding.title}</CardTitle>
                  <p className="text-muted-foreground text-xs">
                    {finding.vendorName} · {finding.assessmentTitle} ·{" "}
                    {formatDate(finding.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge className={SEVERITY_STYLES[finding.severity] ?? ""}>
                  {finding.severity.charAt(0) +
                    finding.severity.slice(1).toLowerCase()}
                </Badge>
                <Badge className={FINDING_STATUS_STYLES[finding.status] ?? ""}>
                  {FINDING_STATUS_LABELS[finding.status] ?? finding.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-muted-foreground text-sm">
              {finding.description}
            </p>
            {finding.controlCodes.length > 0 ? (
              <ControlCodePills codes={finding.controlCodes} />
            ) : null}
            {finding.resolutionNote ? (
              <p className="text-muted-foreground text-xs">
                Note: {finding.resolutionNote}
              </p>
            ) : null}
            {canReview ? (
              <FindingStatusForm
                findingId={finding.id}
                assessmentId={finding.assessmentId}
                currentStatus={finding.status}
                currentNote={finding.resolutionNote ?? ""}
              />
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
