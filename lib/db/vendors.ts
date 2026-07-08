import {
  type DataSensitivity,
  type Prisma,
  type VendorTier,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { type VendorInput } from "@/lib/schemas/vendor";

export const VENDOR_SORTS = {
  name: "Name (A–Z)",
  "name-desc": "Name (Z–A)",
  "score-asc": "Score (low → high)",
  "score-desc": "Score (high → low)",
  tier: "Tier",
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
    ];
  }

  if (filters?.tier) {
    where.tier = filters.tier as VendorTier;
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

function toTier(value: VendorInput["tier"]): VendorTier | null {
  return value === "" ? null : value;
}

function toVendorData(input: VendorInput): Prisma.VendorUncheckedCreateInput {
  return {
    name: input.name,
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
    ownerId: input.ownerId || null,
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
    },
  });
}
