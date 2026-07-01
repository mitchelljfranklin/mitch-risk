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
};

export type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
  user: { id: string; name: string };
};

export function listAuditLogs(filters?: AuditLogFilters) {
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

  return prisma.auditLog.findMany({
    where,
    take: filters?.limit ?? 50,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true } } },
  });
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
  IMPORT_TEMPLATE: "Imported template",
  CREATE_USER: "Created user",
  DISABLE_USER: "Disabled user",
  ENABLE_USER: "Enabled user",
  CHANGE_ROLE: "Changed role",
  RESET_PASSWORD: "Reset password",
  UPDATE_SETTINGS: "Updated settings",
  API_KEY_CREATED: "Created API key",
  API_KEY_REVOKED: "Revoked API key",
  API_KEY_ENABLED: "Enabled API key",
  API_KEY_DELETED: "Deleted API key",
};
