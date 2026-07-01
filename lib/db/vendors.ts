import { type VendorTier } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { type VendorInput } from "@/lib/schemas/vendor";

export function listVendors(filters?: { query?: string; tier?: string }) {
  const where: Record<string, unknown> = {};

  if (filters?.query) {
    const term = filters.query;
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { contactEmail: { contains: term, mode: "insensitive" } },
    ];
  }

  if (filters?.tier) {
    where.tier = filters.tier;
  }

  return prisma.vendor.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { assessments: true } } },
  });
}

export function getVendor(id: string) {
  return prisma.vendor.findUnique({
    where: { id },
    include: {
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

export function createVendor(input: VendorInput) {
  return prisma.vendor.create({
    data: {
      name: input.name,
      contactName: input.contactName || null,
      contactEmail: input.contactEmail,
      tier: toTier(input.tier),
      website: input.website || null,
      notes: input.notes || null,
    },
  });
}

export function updateVendor(id: string, input: VendorInput) {
  return prisma.vendor.update({
    where: { id },
    data: {
      name: input.name,
      contactName: input.contactName || null,
      contactEmail: input.contactEmail,
      tier: toTier(input.tier),
      website: input.website || null,
      notes: input.notes || null,
    },
  });
}

export function deleteVendor(id: string) {
  return prisma.vendor.delete({ where: { id } });
}

export function getVendorForExport(id: string) {
  return prisma.vendor.findUnique({
    where: { id },
    include: {
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
