import { prisma } from "@/lib/prisma";

export type UpcomingKeyDateType = "Certification" | "Contract" | "Reassessment";

export type UpcomingKeyDate = {
  type: UpcomingKeyDateType;
  label: string;
  vendorId: string;
  vendorName: string;
  date: Date;
  daysUntil: number;
};

export async function listUpcomingKeyDates(
  withinDays = 60,
  limit = 10,
): Promise<UpcomingKeyDate[]> {
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + withinDays);

  const [certifications, contracts, reassessments] = await Promise.all([
    prisma.vendorCertification.findMany({
      where: { expiresDate: { lte: horizon } },
      select: {
        name: true,
        expiresDate: true,
        vendorId: true,
        vendor: { select: { name: true } },
      },
    }),
    prisma.vendor.findMany({
      where: { contractRenewalDate: { lte: horizon } },
      select: { id: true, name: true, contractRenewalDate: true },
    }),
    prisma.assessment.findMany({
      where: {
        recurrence: { not: "NONE" },
        nextRunAt: { not: null, lte: horizon },
      },
      select: {
        title: true,
        nextRunAt: true,
        vendorId: true,
        vendor: { select: { name: true } },
      },
    }),
  ]);

  const daysUntil = (date: Date) =>
    Math.ceil((date.getTime() - now.getTime()) / 86400000);

  const items: UpcomingKeyDate[] = [
    ...certifications.map((cert) => ({
      type: "Certification" as const,
      label: cert.name,
      vendorId: cert.vendorId,
      vendorName: cert.vendor.name,
      date: cert.expiresDate,
      daysUntil: daysUntil(cert.expiresDate),
    })),
    ...contracts.map((vendor) => ({
      type: "Contract" as const,
      label: "Contract renewal",
      vendorId: vendor.id,
      vendorName: vendor.name,
      date: vendor.contractRenewalDate as Date,
      daysUntil: daysUntil(vendor.contractRenewalDate as Date),
    })),
    ...reassessments.map((assessment) => ({
      type: "Reassessment" as const,
      label: assessment.title,
      vendorId: assessment.vendorId,
      vendorName: assessment.vendor.name,
      date: assessment.nextRunAt as Date,
      daysUntil: daysUntil(assessment.nextRunAt as Date),
    })),
  ];

  items.sort((a, b) => a.date.getTime() - b.date.getTime());
  return items.slice(0, limit);
}
