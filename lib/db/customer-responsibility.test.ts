import { describe, expect, it } from "vitest";

function matchFrameworkName(
  certName: string,
  frameworkNames: { name: string }[],
): string | null {
  const trimmed = certName.trim();
  if (!trimmed) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  const lowerNoSpace = lower.replace(/\s+/g, "");

  const candidate = frameworkNames.find((framework) => {
    const frameworkLower = framework.name.toLowerCase();
    const frameworkLowerNoSpace = frameworkLower.replace(/\s+/g, "");

    if (
      lower.includes(frameworkLower) ||
      frameworkLower.includes(lower) ||
      lowerNoSpace.includes(frameworkLowerNoSpace)
    ) {
      return true;
    }

    const certWords = lower.split(/[\s:-]+/);
    const frameworkWords = frameworkLower.split(/[\s:-]+/);
    const sharedWords = certWords.filter((word) =>
      frameworkWords.includes(word),
    );

    return sharedWords.length > 0;
  });

  return candidate?.name ?? null;
}

function computeResponsibilityCompliance(
  statuses: string[],
): {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  notApplicable: number;
  percent: number;
} {
  const counts = {
    total: statuses.length,
    completed: 0,
    inProgress: 0,
    pending: 0,
    notApplicable: 0,
  };

  for (const status of statuses) {
    switch (status) {
      case "COMPLETED":
        counts.completed++;
        break;
      case "IN_PROGRESS":
        counts.inProgress++;
        break;
      case "PENDING":
        counts.pending++;
        break;
      case "NOT_APPLICABLE":
        counts.notApplicable++;
        break;
    }
  }

  const effectiveCompleted = counts.completed + counts.notApplicable;

  return {
    ...counts,
    percent:
      counts.total > 0
        ? Math.round((effectiveCompleted / counts.total) * 100)
        : 0,
  };
}

describe("matchFrameworkForCertification", () => {
  const frameworks = [
    { name: "SOC 2" },
    { name: "ISO 27001" },
    { name: "NIST CSF" },
    { name: "Essential Eight" },
  ];

  it("matches 'SOC 2 Type II' to SOC 2", () => {
    expect(matchFrameworkName("SOC 2 Type II", frameworks)).toBe("SOC 2");
  });

  it("matches 'SOC 2' to SOC 2", () => {
    expect(matchFrameworkName("SOC 2", frameworks)).toBe("SOC 2");
  });

  it("matches 'soc 2 type ii' (lowercase) to SOC 2", () => {
    expect(matchFrameworkName("soc 2 type ii", frameworks)).toBe("SOC 2");
  });

  it("matches 'ISO 27001:2022' to ISO 27001", () => {
    expect(matchFrameworkName("ISO 27001:2022", frameworks)).toBe("ISO 27001");
  });

  it("matches 'ISO27001' to ISO 27001 (no space)", () => {
    expect(matchFrameworkName("ISO27001", frameworks)).toBe("ISO 27001");
  });

  it("matches 'NIST CSF 2.0' to NIST CSF", () => {
    expect(matchFrameworkName("NIST CSF 2.0", frameworks)).toBe("NIST CSF");
  });

  it("matches 'Essential Eight Maturity Model' to Essential Eight", () => {
    const result = matchFrameworkName("Essential Eight Maturity Model", frameworks);
    expect(result).toBe("Essential Eight");
  });

  it("returns null for unknown framework", () => {
    expect(matchFrameworkName("PCI DSS", frameworks)).toBeNull();
  });

  it("returns null for generic audit description", () => {
    expect(
      matchFrameworkName("Annual security audit", frameworks),
    ).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(matchFrameworkName("", frameworks)).toBeNull();
  });

  it("matches framework when cert name has extra whitespace", () => {
    expect(matchFrameworkName("  SOC 2 Type II  ", frameworks)).toBe("SOC 2");
  });

  it("returns null when frameworks list is empty", () => {
    expect(matchFrameworkName("SOC 2 Type II", [])).toBeNull();
  });
});

describe("computeResponsibilityCompliance", () => {
  it("returns zero percent for empty status list", () => {
    const result = computeResponsibilityCompliance([]);
    expect(result.total).toBe(0);
    expect(result.completed).toBe(0);
    expect(result.pending).toBe(0);
    expect(result.percent).toBe(0);
  });

  it("counts each status correctly", () => {
    const result = computeResponsibilityCompliance([
      "COMPLETED",
      "COMPLETED",
      "IN_PROGRESS",
      "PENDING",
      "PENDING",
      "PENDING",
      "NOT_APPLICABLE",
    ]);
    expect(result.total).toBe(7);
    expect(result.completed).toBe(2);
    expect(result.inProgress).toBe(1);
    expect(result.pending).toBe(3);
    expect(result.notApplicable).toBe(1);
  });

  it("counts NOT_APPLICABLE as completed for percent calculation", () => {
    const result = computeResponsibilityCompliance([
      "COMPLETED",
      "NOT_APPLICABLE",
      "PENDING",
      "PENDING",
    ]);
    expect(result.percent).toBe(50);
  });

  it("returns 100 percent when all are completed or N/A", () => {
    const result = computeResponsibilityCompliance([
      "COMPLETED",
      "COMPLETED",
      "NOT_APPLICABLE",
      "COMPLETED",
    ]);
    expect(result.percent).toBe(100);
  });

  it("returns 0 percent when all are pending", () => {
    const result = computeResponsibilityCompliance([
      "PENDING",
      "PENDING",
      "PENDING",
    ]);
    expect(result.percent).toBe(0);
  });

  it("rounds percent to nearest integer", () => {
    const result = computeResponsibilityCompliance([
      "COMPLETED",
      "PENDING",
      "PENDING",
    ]);
    expect(result.percent).toBe(33);
  });

  it("handles unknown statuses gracefully", () => {
    const result = computeResponsibilityCompliance(["COMPLETED", "UNKNOWN", "PENDING"]);
    expect(result.completed).toBe(1);
    expect(result.pending).toBe(1);
    expect(result.total).toBe(3);
  });

  it("handles all COMPLETED", () => {
    const result = computeResponsibilityCompliance([
      "COMPLETED",
      "COMPLETED",
    ]);
    expect(result.percent).toBe(100);
    expect(result.completed).toBe(2);
    expect(result.pending).toBe(0);
  });
});
