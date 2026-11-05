"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { AUDIT_ACTION_LABELS, type AuditLogResult } from "@/lib/db/audit-types";
import type { Prisma } from "../../../prisma/generated/prisma/client";

function entityLink(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case "Vendor":
      return `/vendors/${entityId}`;
    case "Assessment":
      return `/assessments/${entityId}`;
    case "Template":
      return `/templates/${entityId}`;
    case "Framework":
      return `/frameworks/${entityId}`;
    case "User":
      return `/admin/users`;
    case "Role":
      return `/admin/roles`;
    case "VendorCertification":
      return `/vendors/${entityId}`;
    case "ApiKey":
      return `/admin/api`;
    case "Webhook":
      return `/admin/webhooks`;
    case "NotificationLog":
      return `/admin/email-tracking`;
    case "TrustCenter":
      return `/trust-center`;
    case "Control":
      return `/frameworks`;
    case "CustomerResponsibilityAction":
      return `/risk-register`;
    default:
      return null;
  }
}

function formatMeta(
  meta: Prisma.JsonValue,
  clarificationLabel: string,
): string {
  if (Array.isArray(meta)) {
    return meta.map(String).join(", ");
  }
  if (!meta || typeof meta !== "object") {
    return String(meta ?? "");
  }
  const record = meta as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof record.decision === "string") {
    const label =
      record.decision === "CLARIFICATION_REQUESTED"
        ? clarificationLabel
        : (record.decision as string).toLowerCase();
    parts.push(label);
  }
  if (typeof record.note === "string" && record.note) {
    parts.push(`"${record.note}"`);
  }
  if (typeof record.status === "string") {
    parts.push(record.status);
  }
  if (typeof record.change === "string") {
    parts.push(record.change.replace(/_/g, " "));
  }
  if (typeof record.newRole === "string") {
    parts.push(record.newRole);
  }
  if (typeof record.message === "string" && record.message) {
    parts.push(record.message);
  }
  return parts.join(" · ") || JSON.stringify(record);
}

type AuditFormProps = {
  result: AuditLogResult;
  actions: string[];
  users: { id: string; name: string }[];
  filterQuery: string;
};

const ACTION_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  LOGIN: "default",
  LOGOUT: "default",
  SEND_ASSESSMENT: "secondary",
  REVIEW_DECISION: "outline",
  CREATE_USER: "secondary",
  DISABLE_USER: "destructive",
  ENABLE_USER: "default",
  CHANGE_ROLE: "outline",
  RESET_PASSWORD: "destructive",
  API_KEY_CREATED: "secondary",
  API_KEY_REVOKED: "destructive",
  API_KEY_ENABLED: "default",
  API_KEY_DELETED: "destructive",
  CREATE_WEBHOOK: "secondary",
  DELETE_WEBHOOK: "destructive",
  ENABLE_WEBHOOK: "default",
  DISABLE_WEBHOOK: "outline",
  UPDATE_TRUST_CENTER: "secondary",
  UPDATE_SETTINGS: "outline",
};

export function AuditForm({
  result,
  actions,
  users,
  filterQuery,
}: AuditFormProps) {
  const translations = useTranslations("Admin.audit");
  const dateFormatter = useFormatter();
  const { entries, totalCount, page, pageSize } = result;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const searchParams = useSearchParams();
  const actionLabel = (action: string) =>
    translations.has(`actions.${action}`)
      ? translations(`actions.${action}`)
      : (AUDIT_ACTION_LABELS[action] ?? action);
  const hasFilters =
    Boolean(searchParams.get("action")) ||
    Boolean(searchParams.get("userId")) ||
    Boolean(searchParams.get("fromDate")) ||
    Boolean(searchParams.get("toDate"));
  const pageHref = (targetPage: number) =>
    `/admin/audit?${filterQuery ? `${filterQuery}&` : ""}auditPage=${targetPage}&auditPageSize=${pageSize}`;

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="tab" value="audit" />
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="action">
            {translations("action")}
          </label>
          <AutoSubmitSelect
            name="action"
            defaultValue={searchParams.get("action") ?? ""}
            key={`action-${searchParams.get("action") ?? ""}`}
            emptyOptionLabel={translations("allActions")}
            id="action"
            className="w-44"
            ariaLabel={translations("actionFilterLabel")}
            options={actions.map((action) => ({
              value: action,
              label: actionLabel(action),
            }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="userId">
            {translations("user")}
          </label>
          <AutoSubmitSelect
            name="userId"
            defaultValue={searchParams.get("userId") ?? ""}
            key={`userId-${searchParams.get("userId") ?? ""}`}
            emptyOptionLabel={translations("allUsers")}
            id="userId"
            className="w-44"
            ariaLabel={translations("userFilterLabel")}
            options={users.map((user) => ({
              value: user.id,
              label: user.name,
            }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="fromDate">
            {translations("from")}
          </label>
          <Input id="fromDate" name="fromDate" type="date" className="w-36" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="toDate">
            {translations("to")}
          </label>
          <Input id="toDate" name="toDate" type="date" className="w-36" />
        </div>
        <div className="flex flex-col gap-1">
          <label
            className="text-muted-foreground text-xs"
            htmlFor="auditPageSize"
          >
            {translations("rows")}
          </label>
          <AutoSubmitSelect
            name="auditPageSize"
            defaultValue={String(pageSize)}
            id="auditPageSize"
            className="w-24"
            ariaLabel={translations("pageSizeLabel")}
            options={[
              { value: "10", label: "10" },
              { value: "25", label: "25" },
              { value: "50", label: "50" },
              { value: "100", label: "100" },
            ]}
          />
        </div>
        <Button type="submit" size="sm">
          {translations("filter")}
        </Button>
        {hasFilters ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/audit">{translations("clear")}</Link>
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {translations("export")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("format", "csv");
                params.delete("tab");
                const url = `/api/v1/audit?${params.toString()}`;
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = "audit-export.csv";
                anchor.click();
              }}
            >
              {translations("allResults")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const header = `${translations("csvHeader")}\n`;
                const rows = entries
                  .map((log) =>
                    [
                      new Date(log.createdAt).toISOString(),
                      log.user.name,
                      actionLabel(log.action),
                      log.entityType ?? "",
                      log.entityId ?? "",
                    ]
                      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
                      .join(","),
                  )
                  .join("\n");
                const blob = new Blob([header + rows], {
                  type: "text/csv",
                });
                const anchor = document.createElement("a");
                anchor.href = URL.createObjectURL(blob);
                anchor.download = "audit-page.csv";
                anchor.click();
                URL.revokeObjectURL(anchor.href);
              }}
            >
              {translations("currentPage")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </form>

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">{translations("empty")}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{translations("date")}</TableHead>
                  <TableHead>{translations("user")}</TableHead>
                  <TableHead>{translations("action")}</TableHead>
                  <TableHead>{translations("entity")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((log) => {
                  const entityHref =
                    log.entityId && log.entityType
                      ? entityLink(log.entityType, log.entityId)
                      : null;
                  const entityLabel = log.entityName ?? translations("deleted");

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {dateFormatter.dateTime(log.createdAt, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.user.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={ACTION_VARIANT[log.action] ?? "outline"}
                          className="text-xs"
                        >
                          {actionLabel(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        <div className="flex flex-col gap-0.5">
                          {log.entityId && log.entityType ? (
                            entityHref ? (
                              <Link
                                href={entityHref}
                                className="text-primary hover:underline"
                              >
                                {entityLabel}
                              </Link>
                            ) : (
                              <span>{entityLabel}</span>
                            )
                          ) : (
                            <span>{log.entityType ?? "—"}</span>
                          )}
                          {log.meta ? (
                            <span className="text-muted-foreground/60">
                              {formatMeta(
                                log.meta,
                                translations("clarificationRequested"),
                              )}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground text-xs">
              {translations("pageSummary", {
                page,
                totalPages,
                totalCount,
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
