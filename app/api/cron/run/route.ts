import { sendEmail } from "@/lib/email/mailer";
import { env } from "@/lib/env";
import { timingSafeEqualString } from "@/lib/timing-safe";
import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
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
import { findOrphanFileKeys } from "@/lib/storage/orphan-sweep";
import { dispatchWebhook } from "@/lib/webhooks";

type NotificationDedupeKey = {
  assessmentId?: string;
  type: string;
  sentTo?: string;
  subject?: string;
  status?: string;
};

function notificationKeyOf(key: NotificationDedupeKey): string {
  return JSON.stringify([
    key.assessmentId ?? null,
    key.type,
    key.sentTo ?? null,
    key.subject ?? null,
    key.status ?? null,
  ]);
}

// One batched lookup replaces a per-item findFirst across the reminder,
// escalation, and expiry loops.
async function findSentNotificationKeys(
  keys: NotificationDedupeKey[],
): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  const rows = await prisma.notificationLog.findMany({
    where: {
      OR: keys.map((key) => ({
        assessmentId: key.assessmentId,
        type: key.type,
        sentTo: key.sentTo,
        subject: key.subject,
        ...(key.status ? { status: key.status } : {}),
      })),
    },
    select: {
      assessmentId: true,
      type: true,
      sentTo: true,
      subject: true,
      status: true,
    },
  });
  const presentRows = new Set(
    rows.map((row) =>
      notificationKeyOf({
        assessmentId: row.assessmentId ?? undefined,
        type: row.type,
        sentTo: row.sentTo ?? undefined,
        subject: row.subject ?? undefined,
        status: row.status ?? undefined,
      }),
    ),
  );
  return new Set(
    keys
      .map(notificationKeyOf)
      .filter((serialized) => presentRows.has(serialized)),
  );
}

export async function GET(request: Request) {
  const providedSecret = request.headers.get("x-cron-secret");
  // Throttle attempts so a short/guessable secret can't be brute-forced
  // online even though the comparison itself is constant-time.
  const clientIp = getClientIp(request.headers);
  if (!rateLimit("cron-secret", clientIp, 10)) {
    return new Response("Too many requests", { status: 429 });
  }
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
    prunedFileKeys?: string[];
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

      const reminderKeys = dueAssessments.map((dueAssessment) => ({
        assessmentId: dueAssessment.id,
        type: "REMINDER",
        sentTo: dueAssessment.vendor.contactEmail,
        status: "SENT",
      }));
      const sentReminderKeys = await findSentNotificationKeys(reminderKeys);

      for (const [index, dueAssessment] of dueAssessments.entries()) {
        if (sentReminderKeys.has(notificationKeyOf(reminderKeys[index]!))) {
          continue;
        }

        const portalUrl = dueAssessment.accessToken
          ? `${appUrl}/portal/${dueAssessment.accessToken}`
          : appUrl;
        await sendEmail(
          dueAssessment.vendor.contactEmail,
          "reminder",
          {
            vendorName: dueAssessment.vendor.name,
            assessmentTitle: dueAssessment.title,
            portalUrl,
            dueDate: dueAssessment.dueDate
              ? dueAssessment.dueDate.toISOString().slice(0, 10)
              : "",
          },
          { assessmentId: dueAssessment.id },
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

    const escalatable = overdue.flatMap((overdueAssessment) =>
      overdueAssessment.reviewer?.email
        ? [
            {
              assessment: overdueAssessment,
              reviewer: overdueAssessment.reviewer,
            },
          ]
        : [],
    );
    const escalationKeys = escalatable.map(({ assessment, reviewer }) => ({
      assessmentId: assessment.id,
      type: "ESCALATION",
      sentTo: reviewer.email,
      status: "SENT",
    }));
    const sentEscalationKeys = await findSentNotificationKeys(escalationKeys);

    for (const [index, { assessment, reviewer }] of escalatable.entries()) {
      if (sentEscalationKeys.has(notificationKeyOf(escalationKeys[index]!))) {
        continue;
      }

      await sendEmail(
        reviewer.email,
        "escalation",
        {
          reviewerName: reviewer.name ?? "Reviewer",
          vendorName: assessment.vendor.name,
          assessmentTitle: assessment.title,
          assessmentUrl: `${appUrl}/assessments/${assessment.id}`,
        },
        { assessmentId: assessment.id },
      );
      result.escalations++;
      dispatchWebhook("ASSESSMENT_OVERDUE", {
        assessmentId: assessment.id,
        assessmentTitle: assessment.title,
        vendorName: assessment.vendor.name,
        dueDate: assessment.dueDate ? assessment.dueDate.toISOString() : null,
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
      const certCandidates = expiringCerts.filter((cert) => cert.ownerEmail);
      const certKeys = certCandidates.map((cert) => ({
        type: "EXPIRY",
        sentTo: cert.ownerEmail!,
        subject: `cert:${cert.id}:${cert.expiresDate.toISOString().slice(0, 10)}:${offsetDays}d`,
      }));
      const sentCertKeys = await findSentNotificationKeys(certKeys);

      for (const [index, cert] of certCandidates.entries()) {
        const logKey = certKeys[index]!.subject;
        if (sentCertKeys.has(notificationKeyOf(certKeys[index]!))) {
          continue;
        }
        const sent = await sendEmail(cert.ownerEmail!, "expiry", {
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
      const contractCandidates = expiringContracts.flatMap((vendor) =>
        vendor.owner?.email && vendor.contractRenewalDate
          ? [
              {
                vendor,
                ownerEmail: vendor.owner.email,
                renewalDate: vendor.contractRenewalDate,
              },
            ]
          : [],
      );
      const contractKeys = contractCandidates.map(
        ({ vendor, ownerEmail, renewalDate }) => ({
          type: "EXPIRY",
          sentTo: ownerEmail,
          subject: `contract:${vendor.id}:${renewalDate
            .toISOString()
            .slice(0, 10)}:${offsetDays}d`,
        }),
      );
      const sentContractKeys = await findSentNotificationKeys(contractKeys);

      for (const [
        index,
        { vendor, ownerEmail, renewalDate },
      ] of contractCandidates.entries()) {
        const logKey = contractKeys[index]!.subject;
        if (sentContractKeys.has(notificationKeyOf(contractKeys[index]!))) {
          continue;
        }
        const sent = await sendEmail(ownerEmail, "expiry", {
          vendorName: vendor.name,
          itemName: "Contract renewal",
          expiresDate: renewalDate.toISOString().slice(0, 10),
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

  for (const recurringAssessment of recurring) {
    const newAssessment = await createAssessment(recurringAssessment.vendorId, {
      title: recurringAssessment.title,
      templateId: recurringAssessment.templateId!,
      dueDate: "",
      reviewerId: recurringAssessment.reviewerId ?? "",
    });
    await sendAssessment(newAssessment.id);

    const next = new Date(now);
    if (recurringAssessment.recurrence === "QUARTERLY") {
      next.setMonth(next.getMonth() + 3);
    } else if (recurringAssessment.recurrence === "ANNUAL") {
      next.setFullYear(next.getFullYear() + 1);
    }
    await prisma.assessment.update({
      where: { id: newAssessment.id },
      data: { recurrence: recurringAssessment.recurrence, nextRunAt: next },
    });
    await prisma.assessment.update({
      where: { id: recurringAssessment.id },
      data: { nextRunAt: null },
    });

    if (smtpConfigured) {
      const vendor = await prisma.vendor.findUnique({
        where: { id: recurringAssessment.vendorId },
        select: { name: true, contactEmail: true },
      });
      if (vendor?.contactEmail) {
        const portalUrl = `${appUrl}/portal/${newAssessment.accessToken ?? ""}`;
        await sendEmail(
          vendor.contactEmail,
          "invite",
          {
            vendorName: vendor.name,
            assessmentTitle: recurringAssessment.title,
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
  // Every storage writer must be reflected here: evidence, attachments
  // (vendor + certification + responsibility actions), and the brand logo.
  const [storedFiles, evidenceRows, attachmentRows, appearance] =
    await Promise.all([
      storage.list(),
      prisma.evidence.findMany({ select: { storageKey: true } }),
      prisma.attachment.findMany({ select: { storageKey: true } }),
      getAppearanceSettings(),
    ]);
  const referencedKeys = new Set([
    ...evidenceRows.map((row) => row.storageKey),
    ...attachmentRows.map((row) => row.storageKey),
  ]);
  if (appearance.logoKey) {
    referencedKeys.add(appearance.logoKey);
  }
  const orphanKeys = findOrphanFileKeys({ storedFiles, referencedKeys, now });
  const deletedFileKeys: string[] = [];
  for (const key of orphanKeys) {
    try {
      await storage.delete(key);
      deletedFileKeys.push(key);
    } catch {
      // Best-effort; will be retried on the next run.
    }
  }
  if (deletedFileKeys.length > 0) {
    result.prunedFiles = deletedFileKeys.length;
    result.prunedFileKeys = deletedFileKeys;
    // Attributability: log every removal with its key so incidents can be
    // reconstructed from server logs alone.
    console.log(
      `[cron] orphan sweep removed ${deletedFileKeys.length} file(s): ${deletedFileKeys.join(", ")}`,
    );
  }

  await prisma.appSetting.upsert({
    where: { key: "cron.lastRun" },
    update: { value: now.toISOString() },
    create: { key: "cron.lastRun", value: now.toISOString(), category: "cron" },
  });

  return Response.json(result);
}
