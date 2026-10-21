"use client";

import { useState, useActionState } from "react";
import { useFormatter, useTranslations } from "next-intl";

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
  FINDING_STATUS_STYLES,
  SEVERITY_ACCENT,
  SEVERITY_STYLES,
} from "@/lib/schemas/assessment";
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
  const translations = useTranslations("RiskRegister.bulk");
  const commonTranslations = useTranslations("Common");
  const dateFormatter = useFormatter();
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

  function statusLabel(status: string): string {
    if (status === "REMEDIATED") {
      return translations("statusRemediated");
    }
    if (status === "RISK_ACCEPTED") {
      return translations("statusRiskAccepted");
    }
    if (status === "OPEN") {
      return translations("statusReopen");
    }
    return commonTranslations.has(`findingStatuses.${status}`)
      ? commonTranslations(`findingStatuses.${status}`)
      : status;
  }

  return (
    <div className="flex flex-col gap-3">
      {canReview && selectedCount > 0 ? (
        <div className="bg-accent/40 sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-lg border p-3">
          <span className="text-sm font-medium">
            {translations("selected", { count: selectedCount })}
          </span>
          <Select value={targetStatus} onValueChange={setTargetStatus}>
            <SelectTrigger className="w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="REMEDIATED">
                {translations("statusRemediated")}
              </SelectItem>
              <SelectItem value="RISK_ACCEPTED">
                {translations("statusRiskAccepted")}
              </SelectItem>
              <SelectItem value="OPEN">
                {translations("statusReopen")}
              </SelectItem>
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
              title={translations("updateTitle", { count: selectedCount })}
              description={translations("updateDescription", {
                count: selectedCount,
                status: statusLabel(targetStatus),
              })}
              confirmLabel={translations("apply")}
              formId="bulk-findings-form"
            >
              <Button type="button" size="sm" disabled={isPending}>
                {isPending ? translations("applying") : translations("apply")}
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
            {translations("clearSelection")}
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
                    {dateFormatter.dateTime(finding.createdAt, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge className={SEVERITY_STYLES[finding.severity] ?? ""}>
                  {commonTranslations.has(`tiers.${finding.severity}`)
                    ? commonTranslations(`tiers.${finding.severity}`)
                    : finding.severity}
                </Badge>
                <Badge className={FINDING_STATUS_STYLES[finding.status] ?? ""}>
                  {commonTranslations.has(`findingStatuses.${finding.status}`)
                    ? commonTranslations(`findingStatuses.${finding.status}`)
                    : finding.status}
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
                {translations("note", { note: finding.resolutionNote })}
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
