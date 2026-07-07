import { prisma } from "@/lib/prisma";
import { getScoringSettings } from "@/lib/settings";
import { computeRiskByTier, ragBand } from "@/lib/dashboard-insights";

type DomainScore = {
  domain: string;
  complianceRatio: number;
  controlCount: number;
};

async function getDomainBreakdown(
  assessmentId: string,
): Promise<DomainScore[]> {
  const questions = await prisma.assessmentQuestion.findMany({
    where: { assessmentId },
    include: { response: true },
  });

  const controlIds = [
    ...new Set(questions.flatMap((question) => question.controlIds)),
  ];
  if (controlIds.length === 0) {
    return [];
  }

  const controls = await prisma.control.findMany({
    where: { id: { in: controlIds } },
    select: { id: true, domain: true },
  });
  const controlDomainMap = new Map(
    controls.map((control) => [control.id, control.domain]),
  );

  const byDomain = new Map<string, { compliant: number; total: number }>();

  for (const question of questions) {
    if (
      !question.response ||
      question.response.isNotApplicable ||
      question.response.isCompliant === null
    ) {
      continue;
    }
    for (const controlId of question.controlIds) {
      const domain = controlDomainMap.get(controlId) ?? "Unmapped";
      const entry = byDomain.get(domain) ?? { compliant: 0, total: 0 };
      entry.total += 1;
      if (question.response.isCompliant) {
        entry.compliant += 1;
      }
      byDomain.set(domain, entry);
    }
  }

  return [...byDomain.entries()]
    .map(([domain, entry]) => ({
      domain,
      complianceRatio: entry.total > 0 ? entry.compliant / entry.total : 0,
      controlCount: entry.total,
    }))
    .sort((a, b) => a.domain.localeCompare(b.domain));
}

export async function getVendorProfile(vendorId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      assessments: {
        where: { status: { notIn: ["DRAFT", "SENT", "IN_PROGRESS"] } },
        orderBy: { submittedAt: "desc" },
        select: { id: true, title: true, submittedAt: true, score: true },
      },
    },
  });
  if (!vendor) {
    return null;
  }

  const latest = vendor.assessments[0];
  let domainBreakdown: DomainScore[] = [];
  if (latest) {
    domainBreakdown = await getDomainBreakdown(latest.id);
  }

  return {
    overallScore: vendor.overallScore,
    lastAssessedAt: vendor.lastAssessedAt,
    history: vendor.assessments.map((assessment) => ({
      id: assessment.id,
      title: assessment.title,
      submittedAt: assessment.submittedAt,
      score: assessment.score,
    })),
    domainBreakdown,
  };
}

export type HeatmapControl = {
  id: string;
  code: string;
  title: string;
  domain: string;
  complianceRatio: number;
  rag: "green" | "amber" | "red" | "none";
};

export async function getVendorHeatmap(
  vendorId: string,
  frameworkId: string,
): Promise<HeatmapControl[]> {
  const latestAssessment = await prisma.assessment.findFirst({
    where: {
      vendorId,
      status: { notIn: ["DRAFT", "SENT", "IN_PROGRESS"] },
    },
    orderBy: { submittedAt: "desc" },
    select: { id: true },
  });
  if (!latestAssessment) {
    return [];
  }

  const questions = await prisma.assessmentQuestion.findMany({
    where: { assessmentId: latestAssessment.id },
    include: { response: true },
  });

  const controls = await prisma.control.findMany({
    where: { frameworkId },
    select: { id: true, code: true, title: true, domain: true },
  });

  const controlMap = new Map(
    controls.map((control) => [
      control.id,
      {
        compliant: 0,
        total: 0,
        code: control.code,
        title: control.title,
        domain: control.domain,
      },
    ]),
  );

  for (const question of questions) {
    if (
      !question.response ||
      question.response.isNotApplicable ||
      question.response.isCompliant === null
    ) {
      continue;
    }
    for (const controlId of question.controlIds) {
      const entry = controlMap.get(controlId);
      if (!entry) {
        continue;
      }
      entry.total += 1;
      if (question.response.isCompliant) {
        entry.compliant += 1;
      }
    }
  }

  const settings = await getScoringSettings();
  const { green, amber } = settings.ragThresholds;

  return [...controlMap.entries()].map(([id, entry]) => {
    const hasQuestions = entry.total > 0;
    const ratio = hasQuestions ? entry.compliant / entry.total : 0;
    let rag: HeatmapControl["rag"];
    if (!hasQuestions) {
      rag = "none";
    } else if (ratio >= green) {
      rag = "green";
    } else if (ratio >= amber) {
      rag = "amber";
    } else {
      rag = "red";
    }
    return {
      id,
      code: entry.code,
      title: entry.title,
      domain: entry.domain,
      complianceRatio: ratio,
      rag,
    };
  });
}

export async function getPortfolioSummary(): Promise<{
  vendors: {
    id: string;
    name: string;
    tier: string | null;
    overallScore: number | null;
    overdueCount: number;
    latestAssessmentTitle: string | null;
    latestAssessmentDate: Date | null;
  }[];
}> {
  const vendors = await prisma.vendor.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      tier: true,
      overallScore: true,
      assessments: {
        where: { status: { notIn: ["DRAFT", "SENT", "IN_PROGRESS"] } },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, createdAt: true, score: true },
      },
      _count: {
        select: {
          assessments: {
            where: {
              status: { in: ["SENT", "IN_PROGRESS"] },
              dueDate: { lt: new Date() },
            },
          },
        },
      },
    },
  });

  return {
    vendors: vendors.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      tier: vendor.tier,
      overallScore: vendor.overallScore,
      overdueCount: vendor._count.assessments,
      latestAssessmentTitle: vendor.assessments[0]?.title ?? null,
      latestAssessmentDate: vendor.assessments[0]?.createdAt ?? null,
    })),
  };
}

function computeScoreDistribution(
  vendors: Array<{ overallScore: number | null }>,
  ragThresholds: { green: number; amber: number },
) {
  const distribution = { green: 0, amber: 0, red: 0, unscored: 0 };
  let totalScore = 0;
  let scoredCount = 0;

  for (const vendor of vendors) {
    if (vendor.overallScore === null) {
      distribution.unscored++;
    } else {
      totalScore += vendor.overallScore;
      scoredCount++;
      distribution[ragBand(vendor.overallScore, ragThresholds)]++;
    }
  }

  return { distribution, totalScore, scoredCount };
}

type VendorWithAssessments = {
  id: string;
  assessments: Array<{ id: string }>;
};

async function computeTopDeficientControls(
  allVendors: VendorWithAssessments[],
) {
  const latestPerVendor = new Map<string, string>();
  for (const vendor of allVendors) {
    const latest = vendor.assessments[0];
    if (latest) {
      latestPerVendor.set(vendor.id, latest.id);
    }
  }

  const latestIds = [...latestPerVendor.values()];
  const deficientResponses =
    latestIds.length > 0
      ? await prisma.response.findMany({
          where: { assessmentId: { in: latestIds }, isCompliant: false },
          select: {
            assessmentQuestion: { select: { controlIds: true } },
            assessment: { select: { vendorId: true } },
          },
        })
      : [];

  const controlVendorMap = new Map<string, Set<string>>();
  for (const response of deficientResponses) {
    for (const controlId of response.assessmentQuestion.controlIds) {
      const vendorSet = controlVendorMap.get(controlId) ?? new Set();
      vendorSet.add(response.assessment.vendorId);
      controlVendorMap.set(controlId, vendorSet);
    }
  }

  const topEntries = [...controlVendorMap.entries()]
    .sort(([, setA], [, setB]) => setB.size - setA.size)
    .slice(0, 10);

  const topControlIds = topEntries.map(([id]) => id);
  const topControls =
    topControlIds.length > 0
      ? await prisma.control.findMany({
          where: { id: { in: topControlIds } },
          select: { id: true, code: true, title: true },
        })
      : [];

  const controlMap = new Map(
    topControls.map((control) => [control.id, control]),
  );

  return topEntries.map(([id, vendorSet]) => ({
    code: controlMap.get(id)?.code ?? "?",
    title: controlMap.get(id)?.title ?? "Unknown",
    vendorCount: vendorSet.size,
  }));
}

export async function getDashboardData() {
  const now = new Date();

  const allVendors = await prisma.vendor.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      tier: true,
      overallScore: true,
      assessments: {
        where: { status: { notIn: ["DRAFT", "SENT", "IN_PROGRESS"] } },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, createdAt: true, score: true },
      },
      _count: {
        select: {
          assessments: {
            where: {
              status: { in: ["SENT", "IN_PROGRESS"] },
              dueDate: { lt: now },
            },
          },
        },
      },
    },
  });

  const [openFindings, needsAttention, statusGroups, overdueCount] =
    await Promise.all([
      prisma.finding.count({ where: { status: "OPEN" } }),
      prisma.assessment.count({
        where: {
          OR: [
            { status: "SUBMITTED" },
            {
              status: { in: ["SENT", "IN_PROGRESS", "SUBMITTED"] },
              dueDate: { lt: now },
            },
          ],
        },
      }),
      prisma.assessment.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.assessment.count({
        where: {
          status: { in: ["SENT", "IN_PROGRESS"] },
          dueDate: { lt: now },
        },
      }),
    ]);

  const assessmentStatusCounts: Record<string, number> = {
    DRAFT: 0,
    SENT: 0,
    IN_PROGRESS: 0,
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    COMPLETED: 0,
    OVERDUE: overdueCount,
  };
  for (const group of statusGroups) {
    assessmentStatusCounts[group.status] = group._count._all;
  }

  const { green: greenThreshold, amber: amberThreshold } = (
    await getScoringSettings()
  ).ragThresholds;
  const ragThresholds = { green: greenThreshold, amber: amberThreshold };

  const riskByTier = computeRiskByTier(
    allVendors.map((vendor) => ({
      tier: vendor.tier,
      overallScore: vendor.overallScore,
    })),
    ragThresholds,
  );

  const { distribution, totalScore, scoredCount } = computeScoreDistribution(
    allVendors,
    ragThresholds,
  );

  const portfolio = allVendors.map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    tier: vendor.tier,
    overallScore: vendor.overallScore,
    overdueCount: vendor._count.assessments,
    latestAssessmentTitle: vendor.assessments[0]?.title ?? null,
    latestAssessmentDate: vendor.assessments[0]?.createdAt ?? null,
  }));

  const topDeficient = await computeTopDeficientControls(allVendors);

  const vendorsByTier: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    Unspecified: 0,
  };
  for (const vendor of allVendors) {
    const tier =
      vendor.tier && vendor.tier in vendorsByTier ? vendor.tier : "Unspecified";
    vendorsByTier[tier] += 1;
  }

  return {
    vendors: portfolio,
    vendorCount: allVendors.length,
    averageScore: scoredCount > 0 ? totalScore / scoredCount : null,
    openFindings,
    needsAttention,
    scoreDistribution: distribution,
    topDeficientControls: topDeficient,
    riskByTier,
    assessmentStatusCounts,
    vendorsByTier,
  };
}
