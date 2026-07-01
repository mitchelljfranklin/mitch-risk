"use client";

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
import { AUDIT_ACTION_LABELS, type AuditLogEntry } from "@/lib/db/audit";
import { formatDate } from "@/lib/utils";

type AuditFormProps = {
  logs: AuditLogEntry[];
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

export function AuditForm({ logs, actions, users }: AuditFormProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          Track administrative and system activity across the platform. Activity
          is retained according to the configured retention policy.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-2">
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
        <Button type="submit" size="sm">
          Filter
        </Button>
      </form>

      {logs.length === 0 ? (
        <p className="text-muted-foreground text-sm">No audit entries found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="p-3 text-left font-medium">Date</th>
                <th className="p-3 text-left font-medium">User</th>
                <th className="p-3 text-left font-medium">Action</th>
                <th className="p-3 text-left font-medium">Entity</th>
                <th className="p-3 text-left font-medium">ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-accent/40 border-b">
                  <td className="text-muted-foreground p-3 text-xs whitespace-nowrap">
                    {formatDate(log.createdAt)}{" "}
                    {log.createdAt.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
                    {log.entityType ?? "—"}
                  </td>
                  <td className="text-muted-foreground p-3 font-mono text-xs">
                    {log.entityId ? log.entityId.slice(0, 8) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
