"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type EmailLogEntry } from "@/lib/db/notifications-types";
import type { EmailLogResult } from "@/lib/db/notifications-types";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { retryEmailSendAction } from "./actions";

type EmailTrackingFormProps = {
  result: EmailLogResult;
  statuses: string[];
  types: string[];
  filterQuery: string;
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
  filterQuery,
}: EmailTrackingFormProps) {
  const translations = useTranslations("Admin.emailTracking");
  const { entries, totalCount, page, pageSize } = result;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const searchParams = useSearchParams();
  const hasFilters =
    Boolean(searchParams.get("status")) ||
    Boolean(searchParams.get("type")) ||
    Boolean(searchParams.get("recipient")) ||
    Boolean(searchParams.get("fromDate")) ||
    Boolean(searchParams.get("toDate"));
  const pageHref = (targetPage: number) =>
    `/admin/email-tracking?${filterQuery ? `${filterQuery}&` : ""}emailLogPage=${targetPage}&emailLogPageSize=${pageSize}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          {translations("description")}
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="tab" value="email-tracking" />
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="status">
            {translations("filters.status")}
          </label>
          <AutoSubmitSelect
            name="status"
            defaultValue={searchParams.get("status") ?? ""}
            key={`status-${searchParams.get("status") ?? ""}`}
            emptyOptionLabel={translations("filters.allStatuses")}
            id="status"
            className="w-32"
            ariaLabel={translations("filters.statusAria")}
            options={statuses.map((status) => ({
              value: status,
              label: translations.has(`statuses.${status}`)
                ? translations(`statuses.${status}`)
                : status,
            }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="type">
            {translations("filters.type")}
          </label>
          <AutoSubmitSelect
            name="type"
            defaultValue={searchParams.get("type") ?? ""}
            key={`type-${searchParams.get("type") ?? ""}`}
            emptyOptionLabel={translations("filters.allTypes")}
            id="type"
            className="w-40"
            ariaLabel={translations("filters.typeAria")}
            options={types.map((type) => ({
              value: type,
              label: translations.has(`types.${type}`)
                ? translations(`types.${type}`)
                : type,
            }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="recipient">
            {translations("filters.recipient")}
          </label>
          <Input
            id="recipient"
            name="recipient"
            type="text"
            placeholder={translations("filters.recipientPlaceholder")}
            className="w-48"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="fromDate">
            {translations("filters.from")}
          </label>
          <Input id="fromDate" name="fromDate" type="date" className="w-36" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="toDate">
            {translations("filters.to")}
          </label>
          <Input id="toDate" name="toDate" type="date" className="w-36" />
        </div>
        <div className="flex flex-col gap-1">
          <label
            className="text-muted-foreground text-xs"
            htmlFor="emailLogPageSize"
          >
            {translations("filters.rows")}
          </label>
          <AutoSubmitSelect
            name="emailLogPageSize"
            defaultValue={String(pageSize)}
            id="emailLogPageSize"
            className="w-24"
            ariaLabel={translations("filters.pageSizeAria")}
            options={[
              { value: "10", label: "10" },
              { value: "25", label: "25" },
              { value: "50", label: "50" },
              { value: "100", label: "100" },
            ]}
          />
        </div>
        <Button type="submit" size="sm">
          {translations("filters.filter")}
        </Button>
        {hasFilters ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/email-tracking">
              {translations("filters.clear")}
            </Link>
          </Button>
        ) : null}
      </form>

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {translations("noLogs")}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{translations("table.date")}</TableHead>
                  <TableHead>{translations("table.recipient")}</TableHead>
                  <TableHead>{translations("table.subject")}</TableHead>
                  <TableHead>{translations("table.type")}</TableHead>
                  <TableHead>{translations("table.status")}</TableHead>
                  <TableHead>{translations("table.detail")}</TableHead>
                  <TableHead>{translations("table.assessment")}</TableHead>
                  <TableHead>{translations("table.sentBy")}</TableHead>
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
              {translations("pagination", {
                page,
                totalPages,
                total: totalCount,
              })}
            </span>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" disabled={page <= 1}>
                <a
                  href={pageHref(page - 1)}
                  onClick={(event) => {
                    if (page <= 1) event.preventDefault();
                  }}
                >
                  {translations("previous")}
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
              >
                <a
                  href={pageHref(page + 1)}
                  onClick={(event) => {
                    if (page >= totalPages) event.preventDefault();
                  }}
                >
                  {translations("next")}
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
  const translations = useTranslations("Admin.emailTracking");
  const dateFormatter = useFormatter();
  const [retryState, action, isPending] = useActionState(
    retryEmailSendAction,
    undefined,
  );
  useActionFeedback(retryState);

  return (
    <TableRow>
      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
        {dateFormatter.dateTime(log.sentAt, {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
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
          {translations.has(`types.${log.type}`)
            ? translations(`types.${log.type}`)
            : log.type}
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
          {translations.has(`statuses.${log.status}`)
            ? translations(`statuses.${log.status}`)
            : log.status}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground max-w-36 truncate text-xs">
        {log.status === "FAILED" && log.errorMessage ? (
          <span title={log.errorMessage}>{log.errorMessage}</span>
        ) : log.status === "SENT" ? (
          translations("accepted")
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
        {log.sentBy?.name ?? translations("system")}
      </TableCell>
      <TableCell>
        {log.status === "FAILED" && log.type !== "RESET" ? (
          <form action={action} className="inline">
            <input type="hidden" name="logId" value={log.id} />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={isPending}
            >
              {isPending ? translations("retrying") : translations("retry")}
            </Button>
          </form>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
