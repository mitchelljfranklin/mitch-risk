import { sendEmail } from "@/lib/email/mailer";
import { env } from "@/lib/env";
import { timingSafeEqualString } from "@/lib/timing-safe";
import { prisma } from "@/lib/prisma";
import { createAssessment, sendAssessment } from "@/lib/db/assessments";
import { listCertificationsExpiringOn } from "@/lib/db/certifications";
import {
  getAppearanceSettings,
  getAssessmentSettings,
  getEmailSettings,
  getAuditRetention,
  getEmailLogRetention,
} from "@/lib/settings";
import { storage } from "@/lib/storage";
import { dispatchWebhook } from "@/lib/webhooks";

export async function GET(request: Request) {
  const providedSecret = request.headers.get("x-cron-secret");
  if (!timingSafeEqualString(providedSecret, env.CRON_SECRET)) {
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
    expiryNotices: number;
    pruned?: number;
    prunedEmails?: number;
    prunedFiles?: number;
  } = { reminders: 0, escalations: 0, recurrences: 0, expiryNotices: 0 };

  // Windows (days before expiry) for certification & contract renewal notices.
  const EXPIRY_OFFSET_DAYS = [30, 7];

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
      dispatchWebhook("ASSESSMENT_OVERDUE", {
        assessmentId: a.id,
        assessmentTitle: a.title,
        vendorName: a.vendor.name,
        dueDate: a.dueDate ? a.dueDate.toISOString() : null,
      });
    }

    // --- certification & contract expiry notices (to the vendor's risk owner) ---
    for (const offsetDays of EXPIRY_OFFSET_DAYS) {
      const target = new Date(today);
      target.setDate(target.getDate() + offsetDays);
      const dayStart = new Date(
        target.getFullYear(),
        target.getMonth(),
        target.getDate(),
      );
      const dayEnd = new Date(
        target.getFullYear(),
        target.getMonth(),
        target.getDate(),
        23,
        59,
        59,
      );

      const expiringCerts = await listCertificationsExpiringOn(
        dayStart,
        dayEnd,
      );
      for (const cert of expiringCerts) {
        if (!cert.ownerEmail) continue;
        const logKey = `cert:${cert.id}:${cert.expiresDate
          .toISOString()
          .slice(0, 10)}:${offsetDays}d`;
        const alreadySent = await prisma.notificationLog.findFirst({
          where: { type: "EXPIRY", sentTo: cert.ownerEmail, subject: logKey },
        });
        if (alreadySent) continue;
        const sent = await sendEmail(cert.ownerEmail, "expiry", {
          vendorName: cert.vendorName,
          itemName: cert.name,
          expiresDate: cert.expiresDate.toISOString().slice(0, 10),
          vendorUrl: `${appUrl}/vendors/${cert.vendorId}`,
        });
        if (sent.ok) {
          // Tag the log so we don't re-notify for this cert on this run window.
          await prisma.notificationLog
            .update({
              where: { id: sent.notificationLogId },
              data: { subject: logKey },
            })
            .catch((updateError: unknown) => {
              console.warn(
                "Cron: failed to tag notification log (cert expiry):",
                updateError instanceof Error
                  ? updateError.message
                  : String(updateError),
              );
            });
          result.expiryNotices++;
          dispatchWebhook("CERTIFICATION_EXPIRING", {
            vendorId: cert.vendorId,
            vendorName: cert.vendorName,
            certificationName: cert.name,
            expiresDate: cert.expiresDate.toISOString(),
          });
        }
      }

      const expiringContracts = await prisma.vendor.findMany({
        where: { contractRenewalDate: { gte: dayStart, lte: dayEnd } },
        select: {
          id: true,
          name: true,
          contractRenewalDate: true,
          owner: { select: { email: true } },
        },
      });
      for (const vendor of expiringContracts) {
        const ownerEmail = vendor.owner?.email;
        if (!ownerEmail || !vendor.contractRenewalDate) continue;
        const logKey = `contract:${vendor.id}:${vendor.contractRenewalDate
          .toISOString()
          .slice(0, 10)}:${offsetDays}d`;
        const alreadySent = await prisma.notificationLog.findFirst({
          where: { type: "EXPIRY", sentTo: ownerEmail, subject: logKey },
        });
        if (alreadySent) continue;
        const sent = await sendEmail(ownerEmail, "expiry", {
          vendorName: vendor.name,
          itemName: "Contract renewal",
          expiresDate: vendor.contractRenewalDate.toISOString().slice(0, 10),
          vendorUrl: `${appUrl}/vendors/${vendor.id}`,
        });
        if (sent.ok) {
          await prisma.notificationLog
            .update({
              where: { id: sent.notificationLogId },
              data: { subject: logKey },
            })
            .catch((updateError: unknown) => {
              console.warn(
                "Cron: failed to tag notification log (contract expiry):",
                updateError instanceof Error
                  ? updateError.message
                  : String(updateError),
              );
            });
          result.expiryNotices++;
        }
      }
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

  // --- orphaned file sweep ---
  const ORPHAN_MIN_AGE_MS = 60 * 60 * 1000; // ignore recent files (in-flight uploads)
  const [storedFiles, evidenceRows, appearance] = await Promise.all([
    storage.list(),
    prisma.evidence.findMany({ select: { storageKey: true } }),
    getAppearanceSettings(),
  ]);
  const referencedKeys = new Set(evidenceRows.map((row) => row.storageKey));
  if (appearance.logoKey) {
    referencedKeys.add(appearance.logoKey);
  }
  let prunedFiles = 0;
  for (const file of storedFiles) {
    if (referencedKeys.has(file.key)) {
      continue;
    }
    if (now.getTime() - file.modifiedAt.getTime() < ORPHAN_MIN_AGE_MS) {
      continue;
    }
    try {
      await storage.delete(file.key);
      prunedFiles += 1;
    } catch {
      // Best-effort; will be retried on the next run.
    }
  }
  if (prunedFiles > 0) {
    result.prunedFiles = prunedFiles;
  }

  await prisma.appSetting.upsert({
    where: { key: "cron.lastRun" },
    update: { value: now.toISOString() },
    create: { key: "cron.lastRun", value: now.toISOString(), category: "cron" },
  });

  return Response.json(result);
}
