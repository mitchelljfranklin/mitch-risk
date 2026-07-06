import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { type CertificationInput } from "@/lib/schemas/certification";

function toData(input: CertificationInput) {
  return {
    name: input.name,
    issuer: input.issuer || null,
    issuedDate: input.issuedDate ? new Date(input.issuedDate) : null,
    expiresDate: new Date(input.expiresDate),
    notes: input.notes || null,
  };
}

export function listVendorCertifications(vendorId: string) {
  return prisma.vendorCertification.findMany({
    where: { vendorId },
    orderBy: { expiresDate: "asc" },
  });
}

export function getCertification(id: string) {
  return prisma.vendorCertification.findUnique({ where: { id } });
}

export function createCertification(
  vendorId: string,
  input: CertificationInput,
) {
  return prisma.vendorCertification.create({
    data: { vendorId, ...toData(input) },
  });
}

export function updateCertification(id: string, input: CertificationInput) {
  return prisma.vendorCertification.update({
    where: { id },
    data: toData(input),
  });
}

export function deleteCertification(id: string) {
  return prisma.vendorCertification.delete({ where: { id } });
}

export function listAttachments(entityType: string, entityId: string) {
  return prisma.attachment.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "asc" },
  });
}

export function createAttachment(input: Prisma.AttachmentCreateInput) {
  return prisma.attachment.create({ data: input });
}

export function deleteAttachmentsForEntity(
  entityType: string,
  entityId: string,
) {
  return prisma.attachment.deleteMany({
    where: { entityType, entityId },
  });
}

export type ExpiringCertification = {
  id: string;
  name: string;
  expiresDate: Date;
  vendorId: string;
  vendorName: string;
  ownerEmail: string | null;
  ownerName: string | null;
};

export async function listCertificationsExpiringOn(
  start: Date,
  end: Date,
): Promise<ExpiringCertification[]> {
  const rows = await prisma.vendorCertification.findMany({
    where: { expiresDate: { gte: start, lte: end } },
    select: {
      id: true,
      name: true,
      expiresDate: true,
      vendorId: true,
      vendor: {
        select: {
          name: true,
          owner: { select: { email: true, name: true } },
        },
      },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    expiresDate: row.expiresDate,
    vendorId: row.vendorId,
    vendorName: row.vendor.name,
    ownerEmail: row.vendor.owner?.email ?? null,
    ownerName: row.vendor.owner?.name ?? null,
  }));
}
