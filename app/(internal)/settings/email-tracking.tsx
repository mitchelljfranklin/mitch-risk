"use client";

import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EMAIL_TYPE_LABELS, type EmailLogEntry } from "@/lib/db/notifications";
import type { EmailLogResult } from "@/lib/db/notifications";
import { formatDate } from "@/lib/utils";
import { retryEmailSendAction } from "./actions";

type EmailTrackingFormProps = {
  result: EmailLogResult;
  statuses: string[];
  types: string[];
};

const TYPE_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  INVITE: "default",
  REMINDER: "secondary",
  ESCALATION: "destructive",
  TEST: "outline",
};

export function EmailTrackingForm({
  result,
  statuses,
  types,
}: EmailTrackingFormProps) {
  const { entries, totalCount, page, pageSize } = result;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          Track every email sent by the platform — invites, reminders,
          escalations, and test messages. The SMTP server confirms acceptance;
          this does not guarantee inbox delivery. Logs are retained according to
          the configured retention policy.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="tab" value="email-tracking" />
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="status">
            Status
          </label>
          <Select name="status">
            <SelectTrigger id="status" className="w-32">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "SENT" ? "Sent" : s === "FAILED" ? "Failed" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="type">
            Type
          </label>
          <Select name="type">
            <SelectTrigger id="type" className="w-40">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {EMAIL_TYPE_LABELS[t] ?? t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="recipient">
            Recipient
          </label>
          <Input
            id="recipient"
            name="recipient"
            type="text"
            placeholder="email@example.com"
            className="w-48"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="fromDate">
            From
          </label>
          <Input id="fromDate" name="fromDate" type="date" className="w-36" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="toDate">
            To
          </label>
          <Input id="toDate" name="toDate" type="date" className="w-36" />
        </div>
        <Button type="submit" size="sm">
          Filter
        </Button>
      </form>

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">No email logs found.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="p-3 text-left font-medium">Date</th>
                  <th className="p-3 text-left font-medium">Recipient</th>
                  <th className="p-3 text-left font-medium">Subject</th>
                  <th className="p-3 text-left font-medium">Type</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Detail</th>
                  <th className="p-3 text-left font-medium">Assessment</th>
                  <th className="p-3 text-left font-medium">Sent by</th>
                  <th className="p-3 text-left font-medium" />
                </tr>
              </thead>
              <tbody>
                {entries.map((log) => (
                  <EmailLogRow key={log.id} log={log} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground text-xs">
              Page {page} of {totalPages} ({totalCount} entries)
            </span>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" disabled={page <= 1}>
                <a
                  href={`/settings?tab=email-tracking&emailLogPage=${page - 1}`}
                  onClick={(e) => {
                    if (page <= 1) e.preventDefault();
                  }}
                >
                  Previous
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
              >
                <a
                  href={`/settings?tab=email-tracking&emailLogPage=${page + 1}`}
                  onClick={(e) => {
                    if (page >= totalPages) e.preventDefault();
                  }}
                >
                  Next
                </a>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmailLogRow({ log }: { log: EmailLogEntry }) {
  const [, action, isPending] = useActionState(retryEmailSendAction, undefined);

  return (
    <tr className="hover:bg-accent/40 border-b">
      <td className="text-muted-foreground p-3 text-xs whitespace-nowrap">
        {formatDate(log.sentAt)}{" "}
        {log.sentAt.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>
      <td className="p-3 font-mono text-xs">{log.sentTo}</td>
      <td
        className="text-muted-foreground max-w-48 truncate p-3 text-xs"
        title={log.subject}
      >
        {log.subject}
      </td>
      <td className="p-3">
        <Badge
          variant={TYPE_VARIANT[log.type] ?? "outline"}
          className="text-xs"
        >
          {EMAIL_TYPE_LABELS[log.type] ?? log.type}
        </Badge>
      </td>
      <td className="p-3">
        <Badge
          variant={
            log.status === "SENT"
              ? "default"
              : log.status === "FAILED"
                ? "destructive"
                : "outline"
          }
          className="text-xs"
        >
          {log.status === "SENT"
            ? "Sent"
            : log.status === "FAILED"
              ? "Failed"
              : log.status}
        </Badge>
      </td>
      <td className="text-muted-foreground max-w-36 truncate p-3 text-xs">
        {log.status === "FAILED" && log.errorMessage ? (
          <span title={log.errorMessage}>{log.errorMessage}</span>
        ) : log.status === "SENT" ? (
          "Accepted by SMTP server"
        ) : (
          "—"
        )}
      </td>
      <td className="p-3 text-xs">
        {log.assessmentId && log.assessmentTitle ? (
          <a
            href={`/assessments/${log.assessmentId}`}
            className="text-primary hover:underline"
          >
            {log.assessmentTitle}
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="text-muted-foreground p-3 text-xs">
        {log.sentBy?.name ?? "System"}
      </td>
      <td className="p-3">
        {log.status === "FAILED" ? (
          <form action={action} className="inline">
            <input type="hidden" name="logId" value={log.id} />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={isPending}
            >
              {isPending ? "Retrying..." : "Retry"}
            </Button>
          </form>
        ) : null}
      </td>
    </tr>
  );
}
