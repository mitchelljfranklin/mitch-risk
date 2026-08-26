"use client";

import { useActionState, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProgressBar } from "@/components/progress-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  updateResponsibilityAction,
  removeResponsibilityAttachment,
} from "@/lib/actions/customer-responsibility";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Paperclip, Trash2 } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "NOT_APPLICABLE", label: "Not Applicable" },
] as const;

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-warning text-warning-foreground",
  IN_PROGRESS: "bg-blue-600 text-white",
  COMPLETED: "bg-[var(--rag-green)] text-white",
  NOT_APPLICABLE: "bg-muted text-muted-foreground",
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

type AttachmentView = {
  id: string;
  fileName: string;
  displayName: string | null;
};

export function CustomerResponsibilityChecklist({
  groups,
  vendorId,
  canEdit,
  attachments,
}: {
  groups: CertGroup[];
  vendorId: string;
  canEdit: boolean;
  attachments?: Map<string, AttachmentView[]>;
}) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <ChecklistCard
          key={group.certificationId ?? "unlinked"}
          group={group}
          vendorId={vendorId}
          canEdit={canEdit}
          attachments={attachments}
        />
      ))}
    </div>
  );
}

function ChecklistCard({
  group,
  vendorId,
  canEdit,
  attachments,
}: {
  group: CertGroup;
  vendorId: string;
  canEdit: boolean;
  attachments?: Map<string, AttachmentView[]>;
}) {
  const [expanded, setExpanded] = useState(true);
  const total = group.actions.length;
  const completed = group.actions.filter(
    (action) =>
      action.status === "COMPLETED" || action.status === "NOT_APPLICABLE",
  ).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <CardTitle className="text-base">
              Customer Responsibility
              {group.certificationName ? (
                <span className="text-muted-foreground text-sm font-normal">
                  {" "}
                  ({group.certificationName})
                </span>
              ) : null}
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 shrink-0 px-1.5 text-xs"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="size-3" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="size-3" />
                  Expand
                </>
              )}
            </Button>
          </div>
          <span className="text-muted-foreground shrink-0 text-xs">
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
                <ActionRow
                  key={action.id}
                  action={action}
                  vendorId={vendorId}
                  canEdit={canEdit}
                  existingAttachments={attachments?.get(action.id) ?? []}
                />
              ))}
            </div>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}

function ActionRow({
  action,
  vendorId,
  canEdit,
  existingAttachments,
}: {
  action: ActionView;
  vendorId: string;
  canEdit: boolean;
  existingAttachments: AttachmentView[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [state, formAction, isPending] = useActionState(
    updateResponsibilityAction,
    undefined,
  );
  useActionFeedback(state);

  const metaParts: string[] = [];
  if (action.assignedToName) {
    metaParts.push(`Assigned to ${action.assignedToName}`);
  }
  if (existingAttachments.length > 0) {
    metaParts.push(
      `${existingAttachments.length} file${existingAttachments.length !== 1 ? "s" : ""}`,
    );
  }
  const metaLine = metaParts.length > 0 ? metaParts.join(" · ") : null;

  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground font-mono text-xs">
              {action.controlCode}
            </span>
            <span className="truncate text-sm">{action.controlTitle}</span>
          </div>
          {metaLine ? (
            <span className="text-muted-foreground text-xs">{metaLine}</span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge
            className={cn(
              STATUS_STYLES[action.status] ?? STATUS_STYLES.PENDING,
            )}
          >
            {STATUS_OPTIONS.find((option) => option.value === action.status)
              ?.label ?? action.status}
          </Badge>
          {canEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 shrink-0 px-1.5 text-xs"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="size-3" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="size-3" />
                  Expand
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <form action={formAction} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="actionId" value={action.id} />
          <input type="hidden" name="vendorId" value={vendorId} />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Status</Label>
              <Select
                key={action.status}
                name="status"
                defaultValue={action.status}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Assigned to</Label>
              <Input
                name="assignedToId"
                placeholder="User ID (optional)"
                defaultValue={action.assignedToName ?? ""}
                className="h-7 text-xs"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="flex items-center gap-1 text-xs">
              <Paperclip className="size-3" />
              Attachment
            </Label>
            <input
              name="attachmentFile"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
              className="text-muted-foreground file:border-input file:bg-background file:text-foreground w-full min-w-0 cursor-pointer text-xs file:mr-2 file:cursor-pointer file:rounded-md file:border file:px-2 file:py-0.5 file:text-xs"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs">Notes</Label>
            <Textarea
              name="notes"
              defaultValue={action.notes ?? ""}
              rows={2}
              className="text-xs"
              placeholder="Add notes about implementation..."
            />
          </div>

          {existingAttachments.length > 0 ? (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">Files</span>
              {existingAttachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between gap-2 rounded border px-2 py-1"
                >
                  <a
                    href={`/api/attachments/${attachment.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary truncate text-xs hover:underline"
                  >
                    {attachment.displayName ?? attachment.fileName}
                  </a>
                  <form action={removeResponsibilityAttachment}>
                    <input
                      type="hidden"
                      name="attachmentId"
                      value={attachment.id}
                    />
                    <input type="hidden" name="vendorId" value={vendorId} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isPending} size="sm">
              {isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExpanded(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
