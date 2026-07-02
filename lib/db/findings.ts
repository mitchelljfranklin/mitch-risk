import { type FindingStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export function getFinding(id: string) {
  return prisma.finding.findUnique({ where: { id } });
}

export function updateFindingStatus(params: {
  findingId: string;
  status: FindingStatus;
  resolutionNote?: string;
  resolvedById: string;
}) {
  const resolved = params.status !== "OPEN";
  return prisma.finding.update({
    where: { id: params.findingId },
    data: {
      status: params.status,
      resolutionNote: params.resolutionNote?.trim() || null,
      resolvedAt: resolved ? new Date() : null,
      resolvedById: resolved ? params.resolvedById : null,
    },
  });
}
