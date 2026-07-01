import { sendEmail } from "@/lib/email/mailer";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { createAssessment, sendAssessment } from "@/lib/db/assessments";
import {
  getAssessmentSettings,
  getEmailSettings,
  getAuditRetention,
  getEmailLogRetention,
} from "@/lib/settings";

export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || !env.CRON_SECRET || secret !== env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [emailSettings, assessmentSettings] = await Promise.all([
    getEmailSettings(),
    getAssessmentSettings(),
  ]);

  const smtpConfigured = Boolean(emailSettings.smtpHost);
  const appUrl = env.APP_URL;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const result: {
    reminders: number;
    escalations: number;
    recurrences: number;
    pruned?: number;
    prunedEmails?: number;
  } = { reminders: 0, escalations: 0, recurrences: 0 };

  if (smtpConfigured) {
    // --- reminders ---
    const offsets = assessmentSettings.reminderOffsetDays ?? [7, 1];
    for (const offsetDays of offsets) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + offsetDays);

      const dueAssessments = await prisma.assessment.findMany({
        where: {
          status: { in: ["SENT", "IN_PROGRESS"] },
          dueDate: {
            gte: new Date(
              targetDate.getFullYear(),
              targetDate.getMonth(),
              targetDate.getDate(),
            ),
            lte: new Date(
              targetDate.getFullYear(),
              targetDate.getMonth(),
              targetDate.getDate(),
              23,
              59,
              59,
            ),
          },
        },
        include: { vendor: { select: { name: true, contactEmail: true } } },
      });

      for (const a of dueAssessments) {
        const alreadySent = await prisma.notificationLog.findFirst({
          where: {
            assessmentId: a.id,
            type: "REMINDER",
            sentTo: a.vendor.contactEmail,
            status: "SENT",
          },
        });
        if (alreadySent) continue;

        const portalUrl = a.accessToken
          ? `${appUrl}/portal/${a.accessToken}`
          : appUrl;
        await sendEmail(
          a.vendor.contactEmail,
          "reminder",
          {
            vendorName: a.vendor.name,
            assessmentTitle: a.title,
            portalUrl,
            dueDate: a.dueDate ? a.dueDate.toISOString().slice(0, 10) : "",
          },
          { assessmentId: a.id },
        );
        result.reminders++;
      }
    }

    // --- overdue escalations ---
    const escalationDays = assessmentSettings.escalationAfterDays ?? 3;
    const overdueSince = new Date(today);
    overdueSince.setDate(overdueSince.getDate() - escalationDays);

    const overdue = await prisma.assessment.findMany({
      where: {
        status: { in: ["SENT", "IN_PROGRESS"] },
        dueDate: { lt: overdueSince },
      },
      include: {
        vendor: { select: { name: true, contactEmail: true } },
        reviewer: { select: { email: true, name: true } },
      },
    });

    for (const a of overdue) {
      if (!a.reviewer?.email) continue;
      const alreadySent = await prisma.notificationLog.findFirst({
        where: {
          assessmentId: a.id,
          type: "ESCALATION",
          sentTo: a.reviewer.email,
          status: "SENT",
        },
      });
      if (alreadySent) continue;

      await sendEmail(
        a.reviewer.email,
        "escalation",
        {
          reviewerName: a.reviewer.name ?? "Reviewer",
          vendorName: a.vendor.name,
          assessmentTitle: a.title,
          assessmentUrl: `${appUrl}/assessments/${a.id}`,
        },
        { assessmentId: a.id },
      );
      result.escalations++;
    }
  }

  // --- recurring assessments ---
  const recurring = await prisma.assessment.findMany({
    where: {
      recurrence: { not: "NONE" },
      nextRunAt: { lte: now },
      status: { not: "DRAFT" },
      templateId: { not: null },
    },
  });

  for (const a of recurring) {
    const newAssessment = await createAssessment(a.vendorId, {
      title: a.title,
      templateId: a.templateId!,
      dueDate: "",
      reviewerId: a.reviewerId ?? "",
    });
    await sendAssessment(newAssessment.id);

    const next = new Date(now);
    if (a.recurrence === "QUARTERLY") {
      next.setMonth(next.getMonth() + 3);
    } else if (a.recurrence === "ANNUAL") {
      next.setFullYear(next.getFullYear() + 1);
    }
    await prisma.assessment.update({
      where: { id: newAssessment.id },
      data: { recurrence: a.recurrence, nextRunAt: next },
    });
    await prisma.assessment.update({
      where: { id: a.id },
      data: { nextRunAt: null },
    });

    if (smtpConfigured) {
      const vendor = await prisma.vendor.findUnique({
        where: { id: a.vendorId },
        select: { name: true, contactEmail: true },
      });
      if (vendor?.contactEmail) {
        const portalUrl = `${appUrl}/portal/${newAssessment.accessToken ?? ""}`;
        await sendEmail(
          vendor.contactEmail,
          "invite",
          {
            vendorName: vendor.name,
            assessmentTitle: a.title,
            portalUrl,
            dueDate: newAssessment.dueDate
              ? newAssessment.dueDate.toISOString().slice(0, 10)
              : "",
          },
          { assessmentId: newAssessment.id },
        );
      }
    }

    result.recurrences++;
  }

  // --- audit log pruning ---
  const retentionDays = await getAuditRetention();
  if (retentionDays > 0) {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const { count } = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (count > 0) {
      result.pruned = count;
    }
  }

  // --- email log pruning ---
  const emailLogRetentionDays = await getEmailLogRetention();
  if (emailLogRetentionDays > 0) {
    const emailCutoff = new Date(now);
    emailCutoff.setDate(emailCutoff.getDate() - emailLogRetentionDays);
    const { count } = await prisma.notificationLog.deleteMany({
      where: { sentAt: { lt: emailCutoff } },
    });
    if (count > 0) {
      result.prunedEmails = count;
    }
  }

  return Response.json(result);
}
