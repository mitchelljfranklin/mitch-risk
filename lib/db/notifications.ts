import { cache } from "react";

import { Prisma } from "../../prisma/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import {
  type EmailLogFilters,
  type EmailLogResult,
  type EmailLogEntry,
  EMAIL_TYPE_LABELS,
} from "./notifications-types";

export {
  type EmailLogFilters,
  type EmailLogResult,
  type EmailLogEntry,
  EMAIL_TYPE_LABELS,
};

export type NotificationCounts = {
  unreviewedSubmissions: number;
  overdueAssessments: number;
  clarificationsAwaitingVendor: number;
  failedEmails: number;
  total: number;
};

export const getNotificationCounts = cache(
  async (): Promise<NotificationCounts> => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      unreviewedSubmissions,
      overdueAssessments,
      clarificationsAwaitingVendor,
      failedEmails,
    ] = await Promise.all([
      prisma.assessment.count({
        where: { status: "SUBMITTED" },
      }),
      prisma.assessment.count({
        where: {
          dueDate: { lt: now },
          status: { in: ["SENT", "IN_PROGRESS", "SUBMITTED"] },
        },
      }),
      prisma.assessment.count({
        where: {
          status: "IN_PROGRESS",
          responses: {
            some: {
              review: { decision: { not: "APPROVED" } },
            },
          },
        },
      }),
      prisma.notificationLog.count({
        where: {
          status: "FAILED",
          sentAt: { gte: twentyFourHoursAgo },
        },
      }),
    ]);

    return {
      unreviewedSubmissions,
      overdueAssessments,
      clarificationsAwaitingVendor,
      failedEmails,
      total:
        unreviewedSubmissions +
        overdueAssessments +
        clarificationsAwaitingVendor +
        failedEmails,
    };
  },
);

const DEFAULT_EMAIL_LOG_PAGE_SIZE = 10;

export async function listEmailLogs(
  filters?: EmailLogFilters,
): Promise<EmailLogResult> {
  const where: Prisma.NotificationLogWhereInput = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.type) {
    where.type = filters.type;
  }

  if (filters?.recipient) {
    where.sentTo = { contains: filters.recipient, mode: "insensitive" };
  }

  if (filters?.fromDate || filters?.toDate) {
    const sentAt: Record<string, Date> = {};
    if (filters?.fromDate) {
      sentAt.gte = new Date(filters.fromDate);
    }
    if (filters?.toDate) {
      const toDate = new Date(filters.toDate);
      toDate.setHours(23, 59, 59, 999);
      sentAt.lte = toDate;
    }
    where.sentAt = sentAt;
  }

  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? DEFAULT_EMAIL_LOG_PAGE_SIZE;

  const [entries, totalCount] = await Promise.all([
    prisma.notificationLog
      .findMany({
        where,
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy: { sentAt: "desc" },
        select: {
          id: true,
          type: true,
          sentTo: true,
          subject: true,
          status: true,
          errorMessage: true,
          sentAt: true,
          assessmentId: true,
          assessment: { select: { title: true } },
          sentBy: { select: { name: true } },
        },
      })
      .then((logs) =>
        logs.map(({ assessment, ...log }) => ({
          ...log,
          assessmentTitle: assessment?.title ?? null,
        })),
      ),
    prisma.notificationLog.count({ where }),
  ]);

  return { entries, totalCount, page, pageSize };
}

export function getEmailLogById(id: string) {
  return prisma.notificationLog
    .findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        sentTo: true,
        subject: true,
        status: true,
        errorMessage: true,
        sentAt: true,
        assessmentId: true,
        assessment: { select: { title: true } },
        sentBy: { select: { name: true } },
      },
    })
    .then((log) =>
      log
        ? (({ assessment, ...rest }) => ({
            ...rest,
            assessmentTitle: assessment?.title ?? null,
          }))(log)
        : null,
    );
}
