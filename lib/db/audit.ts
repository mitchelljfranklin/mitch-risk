import { type Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export function logAudit(
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  meta?: Prisma.InputJsonValue,
) {
  return prisma.auditLog.create({
    data: { userId, action, entityType, entityId, meta },
  });
}

export function logAuditSafe(
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  meta?: Prisma.InputJsonValue,
): void {
  logAudit(userId, action, entityType, entityId, meta).catch((err: unknown) => {
    console.error(
      `Audit log failed (${action}):`,
      err instanceof Error ? err.message : err,
    );
  });
}

export type AuditLogFilters = {
  action?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  page?: number;
  pageSize?: number;
};

export type AuditLogResult = {
  entries: AuditLogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  meta: Prisma.JsonValue | null;
  createdAt: Date;
  user: { id: string; name: string };
};

const DEFAULT_AUDIT_PAGE_SIZE = 10;

export async function listAuditLogs(
  filters?: AuditLogFilters,
): Promise<AuditLogResult> {
  const where: Prisma.AuditLogWhereInput = {};

  if (filters?.action) {
    where.action = filters.action;
  }

  if (filters?.userId) {
    where.userId = filters.userId;
  }

  if (filters?.fromDate) {
    where.createdAt = {
      ...((where.createdAt as Prisma.DateTimeFilter) ?? {}),
      gte: new Date(filters.fromDate),
    };
  }

  if (filters?.toDate) {
    const toDate = new Date(filters.toDate);
    toDate.setHours(23, 59, 59, 999);
    if (!where.createdAt) {
      where.createdAt = { lte: toDate };
    } else {
      (where.createdAt as Prisma.DateTimeFilter).lte = toDate;
    }
  }

  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? DEFAULT_AUDIT_PAGE_SIZE;

  const [rows, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      take: pageSize,
      skip: (page - 1) * pageSize,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const entityNames = await resolveEntityNames(rows);

  const entries: AuditLogEntry[] = rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    entityName:
      entityNames.get(row.entityType ?? "")?.get(row.entityId ?? "") ?? null,
    meta: (row.meta as Prisma.JsonValue) ?? null,
    createdAt: row.createdAt,
    user: row.user ?? { id: "", name: "Deleted user" },
  }));

  return { entries, totalCount, page, pageSize };
}

async function resolveEntityNames(
  rows: { entityType: string | null; entityId: string | null }[],
): Promise<Map<string, Map<string, string>>> {
  const byType = new Map<string, string[]>();

  for (const row of rows) {
    if (!row.entityType || !row.entityId) continue;
    const list = byType.get(row.entityType) ?? [];
    list.push(row.entityId);
    byType.set(row.entityType, list);
  }

  const result = new Map<string, Map<string, string>>();

  await Promise.all(
    [...byType.entries()].map(async ([type, ids]) => {
      const uniqueIds = [...new Set(ids)];
      const map = new Map<string, string>();

      try {
        if (type === "Vendor") {
          const vendors = await prisma.vendor.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, name: true },
          });
          for (const v of vendors) map.set(v.id, v.name);
        } else if (type === "Assessment") {
          const assessments = await prisma.assessment.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, title: true },
          });
          for (const a of assessments) map.set(a.id, a.title);
        } else if (type === "Template") {
          const templates = await prisma.template.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, name: true },
          });
          for (const t of templates) map.set(t.id, t.name);
        } else if (type === "VendorCertification") {
          const certs = await prisma.vendorCertification.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, name: true },
          });
          for (const c of certs) map.set(c.id, c.name);
        } else if (type === "Framework") {
          const frameworks = await prisma.framework.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, name: true },
          });
          for (const f of frameworks) map.set(f.id, f.name);
        } else if (type === "User") {
          const users = await prisma.user.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, name: true },
          });
          for (const u of users) {
            map.set(u.id, u.name ?? "Deleted user");
          }
        } else if (type === "Role") {
          const roles = await prisma.role.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, name: true },
          });
          for (const r of roles) map.set(r.id, r.name);
        } else if (type === "Finding") {
          const findings = await prisma.finding.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, title: true },
          });
          for (const f of findings) map.set(f.id, f.title);
        } else if (type === "ApiKey") {
          const keys = await prisma.apiKey.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, name: true },
          });
          for (const k of keys) map.set(k.id, k.name);
        }
      } catch (error) {
        console.error("[audit] resolveEntityNames failed:", error);
        // entity type may have been deleted — just return no names
      }

      result.set(type, map);
    }),
  );

  return result;
}

export function listAuditActions() {
  return [
    "LOGIN",
    "CREATE_ASSESSMENT",
    "DELETE_ASSESSMENT",
    "SEND_ASSESSMENT",
    "REVOKE_ASSESSMENT",
    "EXTEND_ASSESSMENT",
    "REGENERATE_ASSESSMENT",
    "SUBMIT_ASSESSMENT",
    "REVIEW_DECISION",
    "ADD_COMMENT",
    "REOPEN_ASSESSMENT",
    "FINALIZE_ASSESSMENT",
    "CREATE_VENDOR",
    "UPDATE_VENDOR",
    "DELETE_VENDOR",
    "IMPORT_VENDOR",
    "CREATE_TEMPLATE",
    "UPDATE_TEMPLATE",
    "DELETE_TEMPLATE",
    "PUBLISH_TEMPLATE",
    "UNPUBLISH_TEMPLATE",
    "CREATE_TEMPLATE_VERSION",
    "IMPORT_TEMPLATE",
    "CREATE_USER",
    "DISABLE_USER",
    "ENABLE_USER",
    "CHANGE_ROLE",
    "RESET_PASSWORD",
    "UPDATE_SETTINGS",
    "API_KEY_CREATED",
    "API_KEY_REVOKED",
    "API_KEY_ENABLED",
    "API_KEY_DELETED",
    "CREATE_ROLE",
    "UPDATE_ROLE",
    "DELETE_ROLE",
    "DUPLICATE_ROLE",
    "DELETE_USER",
    "SEND_BACK_TO_VENDOR",
    "REOPEN_REVIEW",
    "UPDATE_FINDING",
    "DUPLICATE_TEMPLATE",
    "UPDATE_PROFILE",
    "CREATE_CERTIFICATION",
    "UPDATE_CERTIFICATION",
    "DELETE_CERTIFICATION",
    "CREATE_FRAMEWORK",
  ];
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  LOGIN: "Login",
  CREATE_ASSESSMENT: "Created assessment",
  DELETE_ASSESSMENT: "Deleted assessment",
  SEND_ASSESSMENT: "Sent assessment",
  REVOKE_ASSESSMENT: "Revoked assessment link",
  EXTEND_ASSESSMENT: "Extended assessment link",
  REGENERATE_ASSESSMENT: "Regenerated assessment link",
  SUBMIT_ASSESSMENT: "Submitted assessment",
  REVIEW_DECISION: "Review decision",
  SEND_BACK_TO_VENDOR: "Sent back to vendor",
  REOPEN_REVIEW: "Reopened review",
  UPDATE_FINDING: "Updated finding",
  ADD_COMMENT: "Added comment",
  REOPEN_ASSESSMENT: "Reopened assessment",
  FINALIZE_ASSESSMENT: "Finalized assessment",
  CREATE_VENDOR: "Created vendor",
  UPDATE_VENDOR: "Updated vendor",
  DELETE_VENDOR: "Deleted vendor",
  IMPORT_VENDOR: "Imported vendor",
  CREATE_TEMPLATE: "Created template",
  UPDATE_TEMPLATE: "Updated template",
  DELETE_TEMPLATE: "Deleted template",
  PUBLISH_TEMPLATE: "Published template",
  UNPUBLISH_TEMPLATE: "Unpublished template",
  CREATE_TEMPLATE_VERSION: "Created template version",
  DUPLICATE_TEMPLATE: "Duplicated template",
  IMPORT_TEMPLATE: "Imported template",
  CREATE_USER: "Created user",
  DELETE_USER: "Deleted user",
  DISABLE_USER: "Disabled user",
  ENABLE_USER: "Enabled user",
  CHANGE_ROLE: "Changed role",
  CREATE_ROLE: "Created role",
  UPDATE_ROLE: "Updated role",
  UPDATE_PROFILE: "Updated profile",
  DELETE_ROLE: "Deleted role",
  DUPLICATE_ROLE: "Duplicated role",
  RESET_PASSWORD: "Reset password",
  UPDATE_SETTINGS: "Updated settings",
  API_KEY_CREATED: "Created API key",
  API_KEY_REVOKED: "Revoked API key",
  API_KEY_ENABLED: "Enabled API key",
  API_KEY_DELETED: "Deleted API key",
  CREATE_CERTIFICATION: "Added certification",
  UPDATE_CERTIFICATION: "Updated certification",
  DELETE_CERTIFICATION: "Deleted certification",
  CREATE_FRAMEWORK: "Imported framework",
};
