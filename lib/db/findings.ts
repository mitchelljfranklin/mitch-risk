import {
  type FindingStatus,
  type RiskWeight,
  type Prisma,
} from "../../prisma/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export function getFinding(id: string) {
  return prisma.finding.findUnique({ where: { id } });
}

export const FINDING_SORTS = {
  priority: "Priority",
  newest: "Newest",
  severity: "Severity",
} as const;

export type FindingSort = keyof typeof FINDING_SORTS;

// RiskWeight (CRITICAL→LOW) and FindingStatus (OPEN→RISK_ACCEPTED) are declared
// in priority order, and Postgres sorts enums by declaration order, so these
// sorts map directly onto Prisma `orderBy` for DB-level pagination.
function buildFindingOrderBy(
  sort: FindingSort,
): Prisma.FindingOrderByWithRelationInput[] {
  if (sort === "newest") {
    return [{ createdAt: "desc" }];
  }
  if (sort === "severity") {
    return [{ severity: "asc" }, { createdAt: "desc" }];
  }
  // priority: open first, then severity, then newest.
  return [{ status: "asc" }, { severity: "asc" }, { createdAt: "desc" }];
}

export type RegisterFinding = {
  id: string;
  title: string;
  description: string;
  severity: RiskWeight;
  status: FindingStatus;
  controlCodes: string[];
  resolutionNote: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  assessmentId: string;
  assessmentTitle: string;
  vendorId: string;
  vendorName: string;
};

const FINDINGS_PAGE_SIZE = 20;

export type FindingFilters = {
  status?: string;
  severity?: string;
  vendorId?: string;
  sort?: FindingSort;
  page?: number;
};

export async function listFindings(filters: FindingFilters = {}): Promise<{
  findings: RegisterFinding[];
  totalCount: number;
  page: number;
  pageSize: number;
}> {
  const where: Prisma.FindingWhereInput = {};
  if (filters.status) {
    where.status = filters.status as FindingStatus;
  }
  if (filters.severity) {
    where.severity = filters.severity as RiskWeight;
  }
  if (filters.vendorId) {
    where.assessment = { vendorId: filters.vendorId };
  }

  const page = Math.max(1, filters.page ?? 1);
  const [rows, totalCount] = await Promise.all([
    prisma.finding.findMany({
      where,
      orderBy: buildFindingOrderBy(filters.sort ?? "priority"),
      take: FINDINGS_PAGE_SIZE,
      skip: (page - 1) * FINDINGS_PAGE_SIZE,
      select: {
        id: true,
        title: true,
        description: true,
        severity: true,
        status: true,
        controlCodes: true,
        resolutionNote: true,
        createdAt: true,
        resolvedAt: true,
        assessmentId: true,
        assessment: {
          select: {
            title: true,
            vendorId: true,
            vendor: { select: { name: true } },
          },
        },
      },
    }),
    prisma.finding.count({ where }),
  ]);

  const findings: RegisterFinding[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    severity: row.severity,
    status: row.status,
    controlCodes: row.controlCodes,
    resolutionNote: row.resolutionNote,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
    assessmentId: row.assessmentId,
    assessmentTitle: row.assessment.title,
    vendorId: row.assessment.vendorId,
    vendorName: row.assessment.vendor.name,
  }));

  return {
    findings,
    totalCount,
    page,
    pageSize: FINDINGS_PAGE_SIZE,
  };
}

export type FindingSummary = {
  open: number;
  remediated: number;
  riskAccepted: number;
  openBySeverity: Record<RiskWeight, number>;
};

export async function getFindingSummary(): Promise<FindingSummary> {
  const [statusCounts, openSeverity] = await Promise.all([
    prisma.finding.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.finding.groupBy({
      by: ["severity"],
      where: { status: "OPEN" },
      _count: { _all: true },
    }),
  ]);

  const byStatus = new Map(
    statusCounts.map((row) => [row.status, row._count._all]),
  );
  const openBySeverity: Record<RiskWeight, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };
  for (const row of openSeverity) {
    openBySeverity[row.severity] = row._count._all;
  }

  return {
    open: byStatus.get("OPEN") ?? 0,
    remediated: byStatus.get("REMEDIATED") ?? 0,
    riskAccepted: byStatus.get("RISK_ACCEPTED") ?? 0,
    openBySeverity,
  };
}

export type VendorFinding = {
  id: string;
  title: string;
  severity: RiskWeight;
  status: FindingStatus;
  assessmentId: string;
  assessmentTitle: string;
  createdAt: Date;
  resolvedAt: Date | null;
};

export async function listVendorFindings(
  vendorId: string,
): Promise<VendorFinding[]> {
  const rows = await prisma.finding.findMany({
    where: { assessment: { vendorId } },
    orderBy: buildFindingOrderBy("priority"),
    select: {
      id: true,
      title: true,
      severity: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      assessmentId: true,
      assessment: { select: { title: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    severity: row.severity,
    status: row.status,
    assessmentId: row.assessmentId,
    assessmentTitle: row.assessment.title,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
  }));
}

export function updateFindingStatus(params: {
  findingId: string;
  status: FindingStatus;
  resolutionNote?: string;
  resolvedById: string | null;
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

export type VendorFindingsSummary = {
  openCount: number;
  severityDots: string[];
};

export async function getOpenFindingsSummaryByVendor(
  vendorIds: string[],
): Promise<Record<string, VendorFindingsSummary>> {
  const summary: Record<string, VendorFindingsSummary> = {};
  for (const vendorId of vendorIds) {
    summary[vendorId] = { openCount: 0, severityDots: [] };
  }

  if (vendorIds.length === 0) return summary;

  const recentFindings = await prisma.finding.findMany({
    where: {
      status: "OPEN",
      assessment: { vendorId: { in: vendorIds } },
    },
    select: {
      severity: true,
      assessment: { select: { vendorId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  for (const finding of recentFindings) {
    const vendorId = finding.assessment.vendorId;
    const vendorSummary = summary[vendorId];
    if (vendorSummary) {
      vendorSummary.openCount++;
      if (vendorSummary.severityDots.length < 3) {
        vendorSummary.severityDots.push(finding.severity);
      }
    }
  }

  return summary;
}
