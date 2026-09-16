import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getAuditRetention } from "@/lib/settings";
import { listAuditLogs, listAuditActions } from "@/lib/db/audit";
import { buildFilterQueryString } from "@/lib/nav";
import { listStaffAccounts } from "@/lib/db/users";
import { AuditForm } from "../audit-form";
import { RetentionForm } from "../retention-form";
import { saveAuditRetentionSettings } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Audit log" };

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requirePermission(PERMISSIONS.AUDIT_VIEW);
  const sp = await searchParams;

  const [auditLogs, actions, staffAccounts, auditRetention] = await Promise.all(
    [
      listAuditLogs({
        action: sp.action,
        userId: sp.userId,
        fromDate: sp.fromDate,
        toDate: sp.toDate,
        page: sp.auditPage ? parseInt(sp.auditPage) : 1,
        pageSize: sp.auditPageSize ? parseInt(sp.auditPageSize) : undefined,
      }),
      listAuditActions(),
      listStaffAccounts(),
      getAuditRetention(),
    ],
  );

  const users = staffAccounts.map((account) => ({
    id: account.id,
    name: account.name,
  }));

  const auditFilterQuery = buildFilterQueryString({
    action: sp.action,
    userId: sp.userId,
    fromDate: sp.fromDate,
    toDate: sp.toDate,
  });

  const canManageRetention = hasPermission(
    user.permissions,
    PERMISSIONS.SETTINGS_MANAGE,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-muted-foreground text-sm">
          Administrative and system activity across the platform.
        </p>
      </div>

      {canManageRetention ? (
        <Card>
          <CardHeader>
            <CardTitle>Retention</CardTitle>
            <CardDescription>
              Audit entries older than this many days are automatically pruned
              by the scheduled cleanup. Set to 0 to keep indefinitely.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RetentionForm
              action={saveAuditRetentionSettings}
              fieldName="auditRetention"
              label="Audit log retention (days)"
              help="Applies on the next scheduled run."
              value={auditRetention}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
          <CardDescription>
            Track administrative and system activity across the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditForm
            result={auditLogs}
            actions={actions}
            users={users}
            filterQuery={auditFilterQuery}
          />
        </CardContent>
      </Card>
    </div>
  );
}
