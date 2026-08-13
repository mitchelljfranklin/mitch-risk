import { type RiskWeight } from "../../prisma/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getScoringSettings } from "@/lib/settings";
import {
  computeDomainCompliance,
  computeRiskByTier,
  ragBand,
} from "@/lib/dashboard-insights";

export type DomainScore = {
  domain: string;
  frameworkId: string;
  frameworkName: string;
  complianceRatio: number;
  controlCount: number;
};

export type FrameworkCompliance = {
  frameworkId: string;
  frameworkName: string;
  frameworkVersion: string;
  mappedControlCount: number;
  domains: { domain: string; complianceRatio: number; controlCount: number }[];
};

type QuestionWithResponse = {
  controlIds: string[];
  riskWeight: RiskWeight;
  response: { isNotApplicable: boolean; isCompliant: boolean | null } | null;
};

function toDomainQuestionInputs(
  questions: QuestionWithResponse[],
  controlDomainMap: Map<string, string>,
) {
  return questions
    .filter((question) =>
      question.controlIds.some((controlId) => controlDomainMap.has(controlId)),
    )
    .map((question) => ({
      controlIds: question.controlIds,
      riskWeight: question.riskWeight,
      isNotApplicable: question.response?.isNotApplicable ?? false,
      isCompliant: question.response?.isCompliant ?? null,
    }));
}

async function getFrameworkCompliance(
  assessmentId: string,
): Promise<FrameworkCompliance[]> {
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
    select: {
      id: true,
      domain: true,
      framework: { select: { id: true, name: true, version: true } },
    },
  });

  const byFramework = new Map<
    string,
    { name: string; version: string; domainMap: Map<string, string> }
  >();
  for (const control of controls) {
    const entry = byFramework.get(control.framework.id) ?? {
      name: control.framework.name,
      version: control.framework.version,
      domainMap: new Map<string, string>(),
    };
    entry.domainMap.set(control.id, control.domain);
    byFramework.set(control.framework.id, entry);
  }

  const { riskWeights } = await getScoringSettings();

  const result: FrameworkCompliance[] = [];
  for (const [frameworkId, frameworkInfo] of byFramework.entries()) {
    const mappedControlIds = new Set<string>();
    for (const question of questions) {
      for (const controlId of question.controlIds) {
        if (frameworkInfo.domainMap.has(controlId)) {
          mappedControlIds.add(controlId);
        }
      }
    }

    const domains = computeDomainCompliance(
      toDomainQuestionInputs(questions, frameworkInfo.domainMap),
      frameworkInfo.domainMap,
      riskWeights,
    ).map((domain) => ({
      domain: domain.domain,
      complianceRatio: domain.ratio,
      controlCount: domain.controlCount,
    }));

    result.push({
      frameworkId,
      frameworkName: frameworkInfo.name,
      frameworkVersion: frameworkInfo.version,
      mappedControlCount: mappedControlIds.size,
      domains,
    });
  }

  return result.sort((a, b) => a.frameworkName.localeCompare(b.frameworkName));
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
  let frameworkCompliance: FrameworkCompliance[] = [];
  if (latest) {
    frameworkCompliance = await getFrameworkCompliance(latest.id);
  }

  const domainBreakdown: DomainScore[] = frameworkCompliance.flatMap(
    (framework) =>
      framework.domains.map((domain) => ({
        domain: domain.domain,
        frameworkId: framework.frameworkId,
        frameworkName: framework.frameworkName,
        complianceRatio: domain.complianceRatio,
        controlCount: domain.controlCount,
      })),
  );

  return {
    overallScore: vendor.overallScore,
    lastAssessedAt: vendor.lastAssessedAt,
    history: vendor.assessments.map((assessment) => ({
      id: assessment.id,
      title: assessment.title,
      submittedAt: assessment.submittedAt,
      score: assessment.score,
    })),
    trend: computeTrend(
      vendor.assessments.map((assessment) => assessment.score),
    ),
    domainBreakdown,
    frameworkCompliance,
  };
}

function computeTrend(scores: (number | null)[]): "up" | "down" | "stable" {
  const filtered = scores.filter((score): score is number => score !== null);
  if (filtered.length < 2) return "stable";

  const n = filtered.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += filtered[i]!;
    sumXY += i * filtered[i]!;
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return "stable";

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const threshold = 0.005;

  if (slope > threshold) return "up";
  if (slope < -threshold) return "down";
  return "stable";
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

export type DomainRadarPoint = {
  domain: string;
  current: number;
  previous: number | null;
};

export async function getVendorDomainRadar(
  vendorId: string,
  frameworkId: string,
): Promise<{ domains: DomainRadarPoint[]; hasPrevious: boolean }> {
  const controls = await prisma.control.findMany({
    where: { frameworkId },
    select: { id: true, domain: true },
  });
  const controlDomainMap = new Map(
    controls.map((control) => [control.id, control.domain]),
  );

  const assessments = await prisma.assessment.findMany({
    where: {
      vendorId,
      status: { notIn: ["DRAFT", "SENT", "IN_PROGRESS"] },
    },
    orderBy: { submittedAt: "desc" },
    take: 2,
    select: { id: true },
  });

  const { riskWeights } = await getScoringSettings();

  const computeForAssessment = async (assessmentId: string) => {
    const questions = await prisma.assessmentQuestion.findMany({
      where: { assessmentId },
      include: { response: true },
    });
    return computeDomainCompliance(
      toDomainQuestionInputs(questions, controlDomainMap),
      controlDomainMap,
      riskWeights,
    );
  };

  const [currentAssessment, previousAssessment] = assessments;
  if (!currentAssessment) {
    return { domains: [], hasPrevious: false };
  }

  const current = await computeForAssessment(currentAssessment.id);
  const previous = previousAssessment
    ? await computeForAssessment(previousAssessment.id)
    : [];

  const previousMap = new Map(
    previous.map((entry) => [entry.domain, entry.ratio]),
  );

  const domains = current.map((entry) => ({
    domain: entry.domain,
    current: Math.round(entry.ratio * 100),
    previous: previousMap.has(entry.domain)
      ? Math.round(previousMap.get(entry.domain)! * 100)
      : null,
  }));

  return { domains, hasPrevious: previous.length > 0 };
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
      createdAt: true,
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

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const completedScores = allVendors.flatMap((vendor) =>
    vendor.assessments
      .filter((assessment) => assessment.score !== null)
      .map((assessment) => ({
        score: assessment.score as number,
        month: assessment.createdAt.toISOString().slice(0, 7),
      })),
  );

  const scoresByMonth = new Map<string, number[]>();
  for (const entry of completedScores) {
    if (!scoresByMonth.has(entry.month)) {
      scoresByMonth.set(entry.month, []);
    }
    scoresByMonth.get(entry.month)!.push(entry.score);
  }

  const sortedMonths = Array.from(scoresByMonth.keys()).sort();
  const portfolioScoreTrend: number[] = [];
  for (const month of sortedMonths) {
    const values = scoresByMonth.get(month)!;
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    portfolioScoreTrend.push(Math.round(avg * 100));
  }
  if (portfolioScoreTrend.length === 0 && allVendors.length > 0) {
    const fallbackAverage = scoredCount > 0 ? totalScore / scoredCount : null;
    const currentAverage =
      fallbackAverage !== null ? Math.round(fallbackAverage * 100) : 0;
    portfolioScoreTrend.push(currentAverage);
  }

  const vendorTrend = computeTrendDirection(
    allVendors.length,
    allVendors.filter((vendor) => vendor.createdAt > sixMonthsAgo).length,
  );

  const findingTrend = computeTrendDirection(
    allVendors.length > 0 ? openFindings : 0,
    openFindings,
  );

  const recentMonths = portfolioScoreTrend.slice(-4);
  const scoreTrend: "up" | "down" | "stable" =
    recentMonths.length >= 2
      ? recentMonths[recentMonths.length - 1]! >
        recentMonths[recentMonths.length - 2]!
        ? "up"
        : recentMonths[recentMonths.length - 1]! <
            recentMonths[recentMonths.length - 2]!
          ? "down"
          : "stable"
      : "stable";

  const portfolio = allVendors.map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    tier: vendor.tier,
    overallScore: vendor.overallScore,
    overdueCount: vendor._count.assessments,
    latestAssessmentTitle: vendor.assessments[0]?.title ?? null,
    latestAssessmentDate: vendor.assessments[0]?.createdAt ?? null,
  }));

  const vendorIdsWithOverdue = portfolio
    .filter((vendor) => vendor.overdueCount > 0)
    .map((vendor) => vendor.id);

  const overdueAssessments =
    vendorIdsWithOverdue.length > 0
      ? await prisma.assessment.findMany({
          where: {
            vendorId: { in: vendorIdsWithOverdue },
            status: { in: ["SENT", "IN_PROGRESS"] },
            dueDate: { lt: now },
          },
          select: { id: true, vendorId: true, dueDate: true },
          orderBy: { dueDate: "asc" },
        })
      : [];

  const mostOverdueByVendor = new Map<
    string,
    { assessmentId: string; dueDate: Date }
  >();
  for (const assessment of overdueAssessments) {
    if (!assessment.dueDate) continue;
    if (!mostOverdueByVendor.has(assessment.vendorId)) {
      mostOverdueByVendor.set(assessment.vendorId, {
        assessmentId: assessment.id,
        dueDate: assessment.dueDate,
      });
    }
  }

  const averageScore = scoredCount > 0 ? totalScore / scoredCount : null;

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
    averageScore,
    openFindings,
    needsAttention,
    scoreDistribution: distribution,
    topDeficientControls: topDeficient,
    riskByTier,
    assessmentStatusCounts,
    vendorsByTier,
    portfolioScoreTrend,
    vendorTrend,
    findingTrend,
    scoreTrend,
    attentionGroups: {
      overdue: portfolio
        .filter((vendor) => vendor.overdueCount > 0)
        .map((vendor) => {
          const mostOverdue = mostOverdueByVendor.get(vendor.id);
          return {
            vendorId: vendor.id,
            vendorName: vendor.name,
            overdueCount: vendor.overdueCount,
            mostOverdueAssessmentId: mostOverdue?.assessmentId ?? null,
            mostOverdueDate: mostOverdue?.dueDate ?? null,
          };
        }),
      belowThreshold: portfolio
        .filter(
          (vendor) =>
            vendor.overallScore !== null &&
            vendor.overallScore < amberThreshold,
        )
        .map((vendor) => ({
          vendorId: vendor.id,
          vendorName: vendor.name,
          score: vendor.overallScore,
        })),
      amberThreshold,
    },
  };
}

function computeTrendDirection(
  current: number,
  previous: number,
): "up" | "down" | "stable" {
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "stable";
}
