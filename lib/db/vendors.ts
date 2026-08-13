import {
  type ContractValue,
  type DataSensitivity,
  type GeographicRisk,
  type Prisma,
  type VendorTier,
} from "../../prisma/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { type VendorInput } from "@/lib/schemas/vendor";

export const VENDOR_SORTS = {
  name: "Name (A–Z)",
  "name-desc": "Name (Z–A)",
  "score-asc": "Score (low → high)",
  "score-desc": "Score (high → low)",
  tier: "Tier (A–Z)",
  "tier-desc": "Tier (Z–A)",
  "last-assessed": "Last assessed",
  assessments: "Most assessments",
} as const;

export type VendorSort = keyof typeof VENDOR_SORTS;

const DEFAULT_PAGE_SIZE = 25;

function vendorOrderBy(
  sort: VendorSort | undefined,
): Prisma.VendorOrderByWithRelationInput {
  switch (sort) {
    case "name-desc":
      return { name: "desc" };
    case "score-asc":
      return { overallScore: { sort: "asc", nulls: "last" } };
    case "score-desc":
      return { overallScore: { sort: "desc", nulls: "last" } };
    case "tier":
      return { tier: { sort: "asc", nulls: "last" } };
    case "tier-desc":
      return { tier: { sort: "desc", nulls: "last" } };
    case "last-assessed":
      return { lastAssessedAt: { sort: "desc", nulls: "last" } };
    case "assessments":
      return { assessments: { _count: "desc" } };
    default:
      return { name: "asc" };
  }
}

export type VendorListFilters = {
  query?: string;
  tier?: string;
  tag?: string;
  externalId?: string;
  sort?: VendorSort;
  page?: number;
  pageSize?: number;
};

export async function listVendors(filters?: VendorListFilters) {
  const where: Prisma.VendorWhereInput = {};

  if (filters?.query) {
    const term = filters.query;
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { contactEmail: { contains: term, mode: "insensitive" } },
      { externalId: { contains: term, mode: "insensitive" } },
      { tags: { hasSome: [term] } },
    ];
  }

  if (filters?.tier) {
    where.tier = filters.tier as VendorTier;
  }

  if (filters?.tag) {
    where.tags = { has: filters.tag };
  }

  if (filters?.externalId) {
    where.externalId = filters.externalId;
  }

  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE;

  const [vendors, totalCount] = await Promise.all([
    prisma.vendor.findMany({
      where,
      orderBy: vendorOrderBy(filters?.sort),
      take: pageSize,
      skip: (page - 1) * pageSize,
      include: { _count: { select: { assessments: true } } },
    }),
    prisma.vendor.count({ where }),
  ]);

  return { vendors, totalCount, page, pageSize };
}

export function listVendorOptions() {
  return prisma.vendor.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export function listAllVendorsBasic() {
  return prisma.vendor.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, contactEmail: true, tier: true },
  });
}

export function exportAllVendors() {
  return prisma.vendor.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      externalId: true,
      contactName: true,
      contactEmail: true,
      tier: true,
      website: true,
      notes: true,
      serviceDescription: true,
      dataSensitivity: true,
      contractRenewalDate: true,
      contractValue: true,
      geographicRisk: true,
      tags: true,
    },
  });
}

export function getVendor(id: string) {
  return prisma.vendor.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true } },
      assessments: {
        orderBy: { createdAt: "desc" },
        include: { template: { select: { name: true, version: true } } },
      },
    },
  });
}

export function getVendorByExternalId(externalId: string) {
  return prisma.vendor.findUnique({
    where: { externalId },
    include: {
      owner: { select: { id: true, name: true } },
      assessments: {
        orderBy: { createdAt: "desc" },
        include: { template: { select: { name: true, version: true } } },
      },
    },
  });
}

function toTier(value: VendorInput["tier"]): VendorTier | null {
  return value === "" ? null : value;
}

function toVendorData(input: VendorInput): Prisma.VendorUncheckedCreateInput {
  return {
    name: input.name,
    externalId: input.externalId?.trim() || null,
    contactName: input.contactName || null,
    contactEmail: input.contactEmail,
    tier: toTier(input.tier),
    website: input.website || null,
    notes: input.notes || null,
    serviceDescription: input.serviceDescription || null,
    dataSensitivity:
      input.dataSensitivity === "" || !input.dataSensitivity
        ? null
        : (input.dataSensitivity as DataSensitivity),
    contractRenewalDate: input.contractRenewalDate
      ? new Date(input.contractRenewalDate)
      : null,
    contractValue:
      !input.contractValue || input.contractValue === ""
        ? null
        : (input.contractValue as ContractValue),
    geographicRisk:
      !input.geographicRisk || input.geographicRisk === ""
        ? null
        : (input.geographicRisk as GeographicRisk),
    ownerId: input.ownerId || null,
    tags: input.tags ?? [],
  };
}

export function createVendor(input: VendorInput) {
  return prisma.vendor.create({ data: toVendorData(input) });
}

export function updateVendor(id: string, input: VendorInput) {
  return prisma.vendor.update({ where: { id }, data: toVendorData(input) });
}

export async function deleteVendor(id: string): Promise<void> {
  const evidence = await prisma.evidence.findMany({
    where: { assessment: { vendorId: id } },
    select: { storageKey: true },
  });
  for (const item of evidence) {
    try {
      await storage.delete(item.storageKey);
    } catch {
      // Best-effort; orphan-sweep cron cleans any leftovers.
    }
  }

  const vendorAttachments = await prisma.attachment.findMany({
    where: { entityType: "Vendor", entityId: id },
    select: { storageKey: true },
  });
  for (const attachment of vendorAttachments) {
    try {
      await storage.delete(attachment.storageKey);
    } catch {
      // Best-effort.
    }
  }
  await prisma.attachment.deleteMany({
    where: { entityType: "Vendor", entityId: id },
  });

  const vendorCertifications = await prisma.vendorCertification.findMany({
    where: { vendorId: id },
    select: { id: true },
  });
  const certificationIds = vendorCertifications.map(
    (certification) => certification.id,
  );
  if (certificationIds.length > 0) {
    const certificationAttachments = await prisma.attachment.findMany({
      where: {
        entityType: "VendorCertification",
        entityId: { in: certificationIds },
      },
      select: { storageKey: true },
    });
    for (const attachment of certificationAttachments) {
      try {
        await storage.delete(attachment.storageKey);
      } catch {
        // Best-effort.
      }
    }
    await prisma.attachment.deleteMany({
      where: {
        entityType: "VendorCertification",
        entityId: { in: certificationIds },
      },
    });
  }

  await prisma.vendor.delete({ where: { id } });
}

export function getVendorForExport(id: string) {
  return prisma.vendor.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true } },
      certifications: {
        orderBy: { expiresDate: "asc" },
        select: {
          name: true,
          issuer: true,
          issuedDate: true,
          expiresDate: true,
        },
      },
      assessments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          score: true,
          submittedAt: true,
          dueDate: true,
          template: { select: { name: true, version: true } },
        },
      },
      responsibilityActions: {
        orderBy: { createdAt: "asc" },
        select: {
          controlCode: true,
          controlTitle: true,
          frameworkName: true,
          status: true,
          assignedTo: { select: { name: true } },
          notes: true,
          completedAt: true,
        },
      },
    },
  });
}

export async function findOrCreateInternalVendor(
  ownerId: string,
  vendorName: string,
): Promise<{ id: string }> {
  let vendor = await prisma.vendor.findFirst({
    where: { name: vendorName },
  });

  if (!vendor) {
    vendor = await prisma.vendor.create({
      data: {
        name: vendorName,
        contactEmail: "internal@local",
        tier: null,
        ownerId,
      },
    });
  } else if (!vendor.ownerId) {
    await prisma.vendor.update({
      where: { id: vendor.id },
      data: { ownerId },
    });
  }

  return { id: vendor.id };
}
