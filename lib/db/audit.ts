import { type Prisma } from "../../prisma/generated/prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type AuditLogFilters,
  type AuditLogResult,
  type AuditLogEntry,
} from "./audit-types";

export {
  type AuditLogFilters,
  type AuditLogResult,
  type AuditLogEntry,
  AUDIT_ACTION_LABELS,
} from "./audit-types";

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
  logAudit(userId, action, entityType, entityId, meta).catch(
    (error: unknown) => {
      console.error(
        `Audit log failed (${action}):`,
        error instanceof Error ? error.message : String(error),
      );
    },
  );
}

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
          for (const vendor of vendors) map.set(vendor.id, vendor.name);
        } else if (type === "Assessment") {
          const assessments = await prisma.assessment.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, title: true },
          });
          for (const assessment of assessments)
            map.set(assessment.id, assessment.title);
        } else if (type === "Template") {
          const templates = await prisma.template.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, name: true },
          });
          for (const template of templates) map.set(template.id, template.name);
        } else if (type === "VendorCertification") {
          const certs = await prisma.vendorCertification.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, name: true },
          });
          for (const cert of certs) map.set(cert.id, cert.name);
        } else if (type === "Framework") {
          const frameworks = await prisma.framework.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, name: true },
          });
          for (const framework of frameworks)
            map.set(framework.id, framework.name);
        } else if (type === "User") {
          const users = await prisma.user.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, name: true },
          });
          for (const user of users) {
            map.set(user.id, user.name ?? "Deleted user");
          }
        } else if (type === "Role") {
          const roles = await prisma.role.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, name: true },
          });
          for (const role of roles) map.set(role.id, role.name);
        } else if (type === "Finding") {
          const findings = await prisma.finding.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, title: true },
          });
          for (const finding of findings) map.set(finding.id, finding.title);
        } else if (type === "ApiKey") {
          const keys = await prisma.apiKey.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, name: true },
          });
          for (const apiKey of keys) map.set(apiKey.id, apiKey.name);
        }
      } catch (error: unknown) {
        console.error(
          "[audit] resolveEntityNames failed:",
          error instanceof Error ? error.message : String(error),
        );
        // entity type may have been deleted — just return no names
      }

      result.set(type, map);
    }),
  );

  return result;
}

export const AUDIT_ACTIONS = {
  LOGIN: "LOGIN",
  CREATE_ASSESSMENT: "CREATE_ASSESSMENT",
  DELETE_ASSESSMENT: "DELETE_ASSESSMENT",
  SEND_ASSESSMENT: "SEND_ASSESSMENT",
  REVOKE_ASSESSMENT: "REVOKE_ASSESSMENT",
  EXTEND_ASSESSMENT: "EXTEND_ASSESSMENT",
  REGENERATE_ASSESSMENT: "REGENERATE_ASSESSMENT",
  SUBMIT_ASSESSMENT: "SUBMIT_ASSESSMENT",
  REVIEW_DECISION: "REVIEW_DECISION",
  ADD_COMMENT: "ADD_COMMENT",
  REOPEN_ASSESSMENT: "REOPEN_ASSESSMENT",
  FINALIZE_ASSESSMENT: "FINALIZE_ASSESSMENT",
  CREATE_VENDOR: "CREATE_VENDOR",
  UPDATE_VENDOR: "UPDATE_VENDOR",
  DELETE_VENDOR: "DELETE_VENDOR",
  IMPORT_VENDOR: "IMPORT_VENDOR",
  CREATE_TEMPLATE: "CREATE_TEMPLATE",
  UPDATE_TEMPLATE: "UPDATE_TEMPLATE",
  DELETE_TEMPLATE: "DELETE_TEMPLATE",
  PUBLISH_TEMPLATE: "PUBLISH_TEMPLATE",
  UNPUBLISH_TEMPLATE: "UNPUBLISH_TEMPLATE",
  CREATE_TEMPLATE_VERSION: "CREATE_TEMPLATE_VERSION",
  IMPORT_TEMPLATE: "IMPORT_TEMPLATE",
  CREATE_USER: "CREATE_USER",
  DISABLE_USER: "DISABLE_USER",
  ENABLE_USER: "ENABLE_USER",
  CHANGE_ROLE: "CHANGE_ROLE",
  RESET_PASSWORD: "RESET_PASSWORD",
  UPDATE_SETTINGS: "UPDATE_SETTINGS",
  API_KEY_CREATED: "API_KEY_CREATED",
  API_KEY_REVOKED: "API_KEY_REVOKED",
  API_KEY_ENABLED: "API_KEY_ENABLED",
  API_KEY_DELETED: "API_KEY_DELETED",
  CREATE_ROLE: "CREATE_ROLE",
  UPDATE_ROLE: "UPDATE_ROLE",
  DELETE_ROLE: "DELETE_ROLE",
  DUPLICATE_ROLE: "DUPLICATE_ROLE",
  DELETE_USER: "DELETE_USER",
  SEND_BACK_TO_VENDOR: "SEND_BACK_TO_VENDOR",
  REOPEN_REVIEW: "REOPEN_REVIEW",
  UPDATE_FINDING: "UPDATE_FINDING",
  DUPLICATE_TEMPLATE: "DUPLICATE_TEMPLATE",
  UPDATE_PROFILE: "UPDATE_PROFILE",
  CREATE_CERTIFICATION: "CREATE_CERTIFICATION",
  UPDATE_CERTIFICATION: "UPDATE_CERTIFICATION",
  DELETE_CERTIFICATION: "DELETE_CERTIFICATION",
  CREATE_FRAMEWORK: "CREATE_FRAMEWORK",
  UPDATE_RESPONSIBILITY_ACTION: "UPDATE_RESPONSIBILITY_ACTION",
  MARK_CONTROL_SHARED: "MARK_CONTROL_SHARED",
  UNMARK_CONTROL_SHARED: "UNMARK_CONTROL_SHARED",
  DELETE_FRAMEWORK: "DELETE_FRAMEWORK",
  RETRY_EMAIL_SEND: "RETRY_EMAIL_SEND",
  CREATE_WEBHOOK: "CREATE_WEBHOOK",
  DELETE_WEBHOOK: "DELETE_WEBHOOK",
  ENABLE_WEBHOOK: "ENABLE_WEBHOOK",
  DISABLE_WEBHOOK: "DISABLE_WEBHOOK",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export function listAuditActions(): string[] {
  return Object.values(AUDIT_ACTIONS);
}
