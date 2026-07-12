"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EMAIL_TYPE_LABELS,
  type EmailLogEntry,
} from "@/lib/db/notifications-types";
import type { EmailLogResult } from "@/lib/db/notifications-types";
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
  const formRef = useRef<HTMLFormElement>(null);
  const searchParams = useSearchParams();
  const hasFilters =
    Boolean(searchParams.get("status")) ||
    Boolean(searchParams.get("type")) ||
    Boolean(searchParams.get("recipient")) ||
    Boolean(searchParams.get("fromDate")) ||
    Boolean(searchParams.get("toDate"));

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

      <form ref={formRef} className="flex flex-wrap items-end gap-2">
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
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === "SENT"
                    ? "Sent"
                    : status === "FAILED"
                      ? "Failed"
                      : status}
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
              {types.map((type) => (
                <SelectItem key={type} value={type}>
                  {EMAIL_TYPE_LABELS[type] ?? type}
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
        <div className="flex flex-col gap-1">
          <label
            className="text-muted-foreground text-xs"
            htmlFor="emailLogPageSize"
          >
            Rows
          </label>
          <Select
            name="emailLogPageSize"
            defaultValue={String(pageSize)}
            onValueChange={() => {
              setTimeout(() => formRef.current?.requestSubmit(), 0);
            }}
          >
            <SelectTrigger id="emailLogPageSize" className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" size="sm">
          Filter
        </Button>
        {hasFilters ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/settings?tab=email-tracking">Clear</Link>
          </Button>
        ) : null}
      </form>

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">No email logs found.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Sent by</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((log) => (
                  <EmailLogRow key={log.id} log={log} />
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground text-xs">
              Page {page} of {totalPages} ({totalCount} entries)
            </span>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" disabled={page <= 1}>
                <a
                  href={`/settings?tab=email-tracking&emailLogPage=${page - 1}&emailLogPageSize=${pageSize}`}
                  onClick={(event) => {
                    if (page <= 1) event.preventDefault();
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
                  href={`/settings?tab=email-tracking&emailLogPage=${page + 1}&emailLogPageSize=${pageSize}`}
                  onClick={(event) => {
                    if (page >= totalPages) event.preventDefault();
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
    <TableRow>
      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
        {formatDate(log.sentAt)}{" "}
        {log.sentAt.getHours().toString().padStart(2, "0")}:
        {log.sentAt.getMinutes().toString().padStart(2, "0")}
      </TableCell>
      <TableCell className="font-mono text-xs">{log.sentTo}</TableCell>
      <TableCell
        className="text-muted-foreground max-w-48 truncate text-xs"
        title={log.subject}
      >
        {log.subject}
      </TableCell>
      <TableCell className="p-3">
        <Badge
          variant={TYPE_VARIANT[log.type] ?? "outline"}
          className="text-xs"
        >
          {EMAIL_TYPE_LABELS[log.type] ?? log.type}
        </Badge>
      </TableCell>
      <TableCell className="p-3">
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
      </TableCell>
      <TableCell className="text-muted-foreground max-w-36 truncate text-xs">
        {log.status === "FAILED" && log.errorMessage ? (
          <span title={log.errorMessage}>{log.errorMessage}</span>
        ) : log.status === "SENT" ? (
          "Accepted by SMTP server"
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-xs">
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
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {log.sentBy?.name ?? "System"}
      </TableCell>
      <TableCell>
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
      </TableCell>
    </TableRow>
  );
}
