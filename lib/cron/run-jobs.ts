import { sendEmail } from "@/lib/email/mailer";
import { env } from "@/lib/env";
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

export type ScheduledJobsResult = {
  reminders: number;
  escalations: number;
  recurrences: number;
  expiryNotices: number;
  pruned?: number;
  prunedEmails?: number;
  prunedFiles?: number;
  prunedFileKeys?: string[];
};

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

// Base identity of a dedupe key: everything except the subject. Subject is
// matched separately because cert/contract expiry keys carry one (their log
// rows are tagged per expiry window) while reminder/escalation keys do not.
function dedupeBaseKeyOf(key: NotificationDedupeKey): string {
  return JSON.stringify([
    key.assessmentId ?? null,
    key.type,
    key.sentTo ?? null,
  ]);
}

// One batched lookup replaces a per-item findFirst across the reminder,
// escalation, and expiry loops.
//
// A key counts as "already sent" when its base fields match a stored row AND:
//   - the key carries no subject (reminders, escalations) -> any stored
//     subject matches, or
//   - the key carries a subject (expiry windows) -> only that exact subject
//     matches.
// Both sides must be normalised through this same rule; comparing raw
// serialisations silently fails whenever one side omits subject and the
// other stores a real email subject line.
export async function findSentNotificationKeys(
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

  const storedByBaseKey = new Map<
    string,
    { statuses: Set<string>; subjects: Set<string> }
  >();
  for (const row of rows) {
    const baseKey = dedupeBaseKeyOf({
      assessmentId: row.assessmentId ?? undefined,
      type: row.type,
      sentTo: row.sentTo,
    });
    let entry = storedByBaseKey.get(baseKey);
    if (!entry) {
      entry = { statuses: new Set(), subjects: new Set() };
      storedByBaseKey.set(baseKey, entry);
    }
    if (row.status !== null) entry.statuses.add(row.status);
    if (row.subject !== null) entry.subjects.add(row.subject);
  }

  const sentKeys = new Set<string>();
  for (const key of keys) {
    const stored = storedByBaseKey.get(dedupeBaseKeyOf(key));
    if (!stored) continue;
    const statusMatches =
      key.status === undefined || stored.statuses.has(key.status);
    const subjectMatches =
      key.subject === undefined || stored.subjects.has(key.subject);
    if (statusMatches && subjectMatches) {
      sentKeys.add(notificationKeyOf(key));
    }
  }
  return sentKeys;
}

// Scheduled jobs treat calendar-day fields (dueDate, expiresDate,
// contractRenewalDate) as UTC calendar days - they are entered as YYYY-MM-DD
// and stored as UTC-midnight instants. Building the reminder/escalation/
// expiry windows in server-local time shifted every window a day for
// deployments west of UTC. All window math below therefore runs on UTC.
export function utcDayStartOf(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function addUtcDays(dayStart: Date, days: number): Date {
  const shifted = new Date(dayStart.getTime());
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}

export function endOfUtcDay(dayStart: Date): Date {
  return new Date(addUtcDays(dayStart, 1).getTime() - 1);
}

// Runs every scheduled job once: reminders, escalations, expiry notices,
// recurring assessments, log pruning, and the orphaned-file sweep.
// Jobs are idempotent (notification dedupe keys), so calling this more
// often than needed never double-sends.
export async function runScheduledJobs(
  clockNow: Date = new Date(),
): Promise<ScheduledJobsResult> {
  const [emailSettings, assessmentSettings] = await Promise.all([
    getEmailSettings(),
    getAssessmentSettings(),
  ]);

  const smtpConfigured = Boolean(emailSettings.smtpHost);
  const appUrl = env.APP_URL;
  const now = clockNow;
  const today = utcDayStartOf(now);

  const result: ScheduledJobsResult = {
    reminders: 0,
    escalations: 0,
    recurrences: 0,
    expiryNotices: 0,
  };

  // Windows (days before expiry) for certification & contract renewal notices.
  const EXPIRY_OFFSET_DAYS = [30, 7];

  if (smtpConfigured) {
    // --- reminders ---
    const offsets = assessmentSettings.reminderOffsetDays ?? [7, 1];
    for (const offsetDays of offsets) {
      const targetDay = addUtcDays(today, offsetDays);

      const dueAssessments = await prisma.assessment.findMany({
        where: {
          status: { in: ["SENT", "IN_PROGRESS"] },
          dueDate: {
            gte: targetDay,
            lte: endOfUtcDay(targetDay),
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
    const overdueSince = addUtcDays(today, -escalationDays);

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
      const dayStart = addUtcDays(today, offsetDays);
      const dayEnd = endOfUtcDay(dayStart);

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

  return result;
}
