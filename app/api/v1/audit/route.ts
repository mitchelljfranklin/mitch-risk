import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { apiError, runApiHandler } from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { AUDIT_ACTION_LABELS, listAuditLogs } from "@/lib/db/audit";
import { csvEscape } from "@/lib/utils";

export async function GET(request: Request) {
  return runApiHandler(async () => {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return apiError("Unauthorized", 401);
    }
    if (!authResultHasPermission(auth, PERMISSIONS.AUDIT_VIEW)) {
      return apiError("Forbidden", 403);
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") ?? undefined;
    const userId = searchParams.get("userId") ?? undefined;
    const fromDate = searchParams.get("fromDate") ?? undefined;
    const toDate = searchParams.get("toDate") ?? undefined;
    const page = parseInt(searchParams.get("page") ?? "1", 10) || 1;
    const format = searchParams.get("format") ?? "json";
    const isCsv = format === "csv";
    const parsedPageSize =
      parseInt(searchParams.get("pageSize") ?? "10", 10) || 10;
    const pageSize = isCsv
      ? Math.min(parsedPageSize, 100000)
      : Math.min(parsedPageSize, 100);

    const result = await listAuditLogs({
      action,
      userId,
      fromDate,
      toDate,
      page,
      pageSize,
    });
    const { entries, totalCount } = result;

    if (format === "csv") {
      const header = [
        csvEscape("ID"),
        csvEscape("Action"),
        csvEscape("User"),
        csvEscape("Entity Type"),
        csvEscape("Entity Name"),
        csvEscape("Meta"),
        csvEscape("Timestamp"),
      ].join(",");
      const rows = entries.map((log) =>
        [
          csvEscape(log.id),
          csvEscape(AUDIT_ACTION_LABELS[log.action] ?? log.action),
          csvEscape(log.user.name),
          csvEscape(log.entityType ?? ""),
          csvEscape(log.entityName ?? ""),
          csvEscape(
            log.meta && typeof log.meta === "object"
              ? JSON.stringify(log.meta)
              : "",
          ),
          csvEscape(log.createdAt.toISOString()),
        ].join(","),
      );
      const csv = [header, ...rows].join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="audit-export.csv"`,
        },
      });
    }

    return Response.json({
      entries: entries.map((log) => ({
        id: log.id,
        action: log.action,
        actionLabel: AUDIT_ACTION_LABELS[log.action] ?? log.action,
        userName: log.user.name,
        entityType: log.entityType,
        entityId: log.entityId,
        entityName: log.entityName,
        meta: log.meta,
        createdAt: log.createdAt,
      })),
      page: result.page,
      pageSize: result.pageSize,
      totalCount,
    });
  });
}
