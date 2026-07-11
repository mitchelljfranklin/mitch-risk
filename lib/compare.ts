export type ResponseDiff = {
  answerChanged: boolean;
  complianceChanged: boolean;
  complianceImproved: boolean;
  complianceDegraded: boolean;
};

export function compareResponses(
  a: { value: unknown; isCompliant: boolean | null },
  b: { value: unknown; isCompliant: boolean | null },
): ResponseDiff {
  const aValue = String(a.value ?? "");
  const bValue = String(b.value ?? "");
  const answerChanged = aValue !== bValue;

  const aCompliant = a.isCompliant;
  const bCompliant = b.isCompliant;
  const complianceChanged = aCompliant !== bCompliant;
  const complianceImproved =
    complianceChanged &&
    bCompliant === true &&
    (aCompliant === null || aCompliant === false);
  const complianceDegraded =
    complianceChanged &&
    aCompliant === true &&
    (bCompliant === null || bCompliant === false);

  return {
    answerChanged,
    complianceChanged,
    complianceImproved,
    complianceDegraded,
  };
}

export type CompareSummary = {
  totalQuestions: number;
  answersChanged: number;
  complianceImproved: number;
  complianceDegraded: number;
};

export function computeCompareSummary(diffs: ResponseDiff[]): CompareSummary {
  return {
    totalQuestions: diffs.length,
    answersChanged: diffs.filter((d) => d.answerChanged).length,
    complianceImproved: diffs.filter((d) => d.complianceImproved).length,
    complianceDegraded: diffs.filter((d) => d.complianceDegraded).length,
  };
}
