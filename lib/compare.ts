export type ResponseDiff = {
  answerChanged: boolean;
  complianceChanged: boolean;
  complianceImproved: boolean;
  complianceDegraded: boolean;
};

export function compareResponses(
  left: { value: unknown; isCompliant: boolean | null },
  right: { value: unknown; isCompliant: boolean | null },
): ResponseDiff {
  const leftValue = String(left.value ?? "");
  const rightValue = String(right.value ?? "");
  const answerChanged = leftValue !== rightValue;

  const leftCompliant = left.isCompliant;
  const rightCompliant = right.isCompliant;
  const complianceChanged = leftCompliant !== rightCompliant;
  const complianceImproved =
    complianceChanged &&
    rightCompliant === true &&
    (leftCompliant === null || leftCompliant === false);
  const complianceDegraded =
    complianceChanged &&
    leftCompliant === true &&
    (rightCompliant === null || rightCompliant === false);

  return {
    answerChanged,
    complianceChanged,
    complianceImproved,
    complianceDegraded,
  };
}
