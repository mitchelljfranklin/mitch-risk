import {
  type FindingStatus,
  type RiskWeight,
  type Prisma,
} from "@prisma/client";

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

const SEVERITY_RANK: Record<RiskWeight, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const STATUS_RANK: Record<FindingStatus, number> = {
  OPEN: 0,
  REMEDIATED: 1,
  RISK_ACCEPTED: 2,
};

export type RegisterFinding = {
  id: string;
  title: string;
  description: string;
  severity: RiskWeight;
  status: FindingStatus;
  controlCodes: string[];
  resolutionNote: string | null;
  createdAt: Date;
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

  const rows = await prisma.finding.findMany({
    where,
    select: {
      id: true,
      title: true,
      description: true,
      severity: true,
      status: true,
      controlCodes: true,
      resolutionNote: true,
      createdAt: true,
      assessmentId: true,
      assessment: {
        select: {
          title: true,
          vendorId: true,
          vendor: { select: { name: true } },
        },
      },
    },
  });

  const findings: RegisterFinding[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    severity: row.severity,
    status: row.status,
    controlCodes: row.controlCodes,
    resolutionNote: row.resolutionNote,
    createdAt: row.createdAt,
    assessmentId: row.assessmentId,
    assessmentTitle: row.assessment.title,
    vendorId: row.assessment.vendorId,
    vendorName: row.assessment.vendor.name,
  }));

  sortFindings(findings, filters.sort ?? "priority");

  const page = Math.max(1, filters.page ?? 1);
  const start = (page - 1) * FINDINGS_PAGE_SIZE;
  return {
    findings: findings.slice(start, start + FINDINGS_PAGE_SIZE),
    totalCount: findings.length,
    page,
    pageSize: FINDINGS_PAGE_SIZE,
  };
}

function sortFindings(findings: RegisterFinding[], sort: FindingSort): void {
  findings.sort((a, b) => {
    if (sort === "newest") {
      return b.createdAt.getTime() - a.createdAt.getTime();
    }
    if (sort === "severity") {
      return (
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
        b.createdAt.getTime() - a.createdAt.getTime()
      );
    }
    // priority: open first, then severity, then newest.
    return (
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  });
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
};

export async function listVendorFindings(
  vendorId: string,
): Promise<VendorFinding[]> {
  const rows = await prisma.finding.findMany({
    where: { assessment: { vendorId } },
    select: {
      id: true,
      title: true,
      severity: true,
      status: true,
      createdAt: true,
      assessmentId: true,
      assessment: { select: { title: true } },
    },
  });

  return rows
    .map((row) => ({
      id: row.id,
      title: row.title,
      severity: row.severity,
      status: row.status,
      assessmentId: row.assessmentId,
      assessmentTitle: row.assessment.title,
      createdAt: row.createdAt,
    }))
    .sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
        b.createdAt.getTime() - a.createdAt.getTime(),
    );
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
