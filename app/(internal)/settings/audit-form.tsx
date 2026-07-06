"use client";

import { useRef } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AUDIT_ACTION_LABELS, type AuditLogEntry } from "@/lib/db/audit";
import type { AuditLogResult } from "@/lib/db/audit";
import type { Prisma } from "@prisma/client";
import { formatDate } from "@/lib/utils";

function entityLink(entityType: string, entityId: string): string {
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
      return `/settings?tab=users`;
    case "Role":
      return `/settings?tab=roles`;
    case "VendorCertification":
      return `/vendors/${entityId}`;
    default:
      return "#";
  }
}

function formatMeta(meta: Prisma.JsonValue): string {
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
        ? "clarification requested"
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
};

export function AuditForm({ result, actions, users }: AuditFormProps) {
  const { entries, totalCount, page, pageSize } = result;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-6">
      <form ref={formRef} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="tab" value="audit" />
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="action">
            Action
          </label>
          <Select name="action">
            <SelectTrigger id="action" className="w-44">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              {actions.map((a) => (
                <SelectItem key={a} value={a}>
                  {AUDIT_ACTION_LABELS[a] ?? a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="userId">
            User
          </label>
          <Select name="userId">
            <SelectTrigger id="userId" className="w-44">
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            htmlFor="auditPageSize"
          >
            Rows
          </label>
          <Select
            name="auditPageSize"
            defaultValue={String(pageSize)}
            onValueChange={() => {
              setTimeout(() => formRef.current?.requestSubmit(), 0);
            }}
          >
            <SelectTrigger id="auditPageSize" className="w-24">
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Export
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
              All results
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const header = "Date,User,Action,Entity,ID\n";
                const rows = entries
                  .map((log) =>
                    [
                      new Date(log.createdAt).toISOString(),
                      log.user.name,
                      AUDIT_ACTION_LABELS[log.action] ?? log.action,
                      log.entityType ?? "",
                      log.entityId ?? "",
                    ]
                      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
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
              Current page
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </form>

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">No audit entries found.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="p-3 text-left font-medium">Date</th>
                  <th className="p-3 text-left font-medium">User</th>
                  <th className="p-3 text-left font-medium">Action</th>
                  <th className="p-3 text-left font-medium">Entity</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((log) => (
                  <tr key={log.id} className="hover:bg-accent/40 border-b">
                    <td className="text-muted-foreground p-3 text-xs whitespace-nowrap">
                      {formatDate(log.createdAt)}{" "}
                      {log.createdAt.getHours().toString().padStart(2, "0")}:
                      {log.createdAt.getMinutes().toString().padStart(2, "0")}
                    </td>
                    <td className="p-3 font-medium">{log.user.name}</td>
                    <td className="p-3">
                      <Badge
                        variant={ACTION_VARIANT[log.action] ?? "outline"}
                        className="text-xs"
                      >
                        {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground p-3 text-xs">
                      <div className="flex flex-col gap-0.5">
                        {log.entityId && log.entityType ? (
                          <Link
                            href={entityLink(log.entityType, log.entityId)}
                            className="text-primary hover:underline"
                          >
                            {log.entityName ?? "Deleted"}
                          </Link>
                        ) : (
                          <span>{log.entityType ?? "—"}</span>
                        )}
                        {log.meta ? (
                          <span className="text-muted-foreground/60">
                            {formatMeta(log.meta)}
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
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
                  href={`/settings?tab=audit&auditPage=${page - 1}&auditPageSize=${pageSize}`}
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
                  href={`/settings?tab=audit&auditPage=${page + 1}&auditPageSize=${pageSize}`}
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
