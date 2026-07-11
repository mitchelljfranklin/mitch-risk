import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

import { formatDate, formatPercent } from "@/lib/utils";

type AssessmentPdfData = {
  title: string;
  organizationName: string;
  vendorName: string;
  vendorContact: string;
  vendorTier: string | null;
  score: number | null;
  dueDate: Date | null;
  completedAt: Date | null;
  reviewerName: string | null;
  templateName: string | null;
  templateVersion: number | null;
  questions: {
    sectionTitle: string;
    text: string;
    type: string;
    riskWeight: string;
    required: boolean;
    answer: string;
    isNa: boolean;
    isCompliant: boolean | null;
    scorePct: number | null;
  }[];
  findings: {
    title: string;
    severity: string;
    controls: string[];
    description: string;
  }[];
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 16,
    borderBottom: "1 solid #e5e7eb",
    paddingBottom: 8,
  },
  orgName: { fontSize: 12, color: "#6b7280" },
  title: { fontSize: 18, fontWeight: "bold", marginTop: 4 },
  vendorInfo: { fontSize: 10, color: "#374151", marginTop: 8 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 13, fontWeight: "bold", marginBottom: 8 },
  scoreValue: { fontSize: 22, fontWeight: "bold", marginTop: 4 },
  table: { width: "100%" },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #e5e7eb",
    paddingVertical: 4,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "2 solid #d1d5db",
    paddingVertical: 4,
    backgroundColor: "#f9fafb",
  },
  col1: { width: "24%", fontSize: 9 },
  col2: { width: "24%", fontSize: 9 },
  col3: { width: "10%", fontSize: 9 },
  col4: { width: "14%", fontSize: 9 },
  col5: { width: "14%", fontSize: 9 },
  col6: { width: "14%", fontSize: 9 },
  label: { fontWeight: "bold", fontSize: 9 },
  findingRow: {
    marginBottom: 8,
    borderLeft: "3 solid #ef4444",
    paddingLeft: 8,
  },
  findingTitle: { fontSize: 10, fontWeight: "bold" },
  findingMeta: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  badgeGreen: { color: "#16a34a", fontSize: 9 },
  badgeRed: { color: "#dc2626", fontSize: 9 },
  badgeAmber: { color: "#d97706", fontSize: 9 },
  badgeNeutral: { color: "#6b7280", fontSize: 9 },
  controlChip: {
    fontSize: 7,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginRight: 2,
    marginTop: 2,
    borderRadius: 2,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
  },
});

function scoreColor(score: number | null): string {
  if (score === null) return "#6b7280";
  if (score >= 0.85) return "#16a34a";
  if (score >= 0.6) return "#d97706";
  return "#dc2626";
}

function ragColor(isCompliant: boolean | null): string {
  if (isCompliant === true) return "#16a34a";
  if (isCompliant === false) return "#dc2626";
  return "#6b7280";
}

function ragLabel(scorePct: number | null): string {
  if (scorePct === null) return "--%";
  return formatPercent(scorePct);
}

function AssessmentPdfDocument({ data }: { data: AssessmentPdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.orgName}>{data.organizationName}</Text>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.vendorInfo}>
            {data.vendorContact}
            {data.vendorTier ? ` | Tier: ${data.vendorTier}` : ""}
            {data.templateName
              ? ` | Template: ${data.templateName} v${data.templateVersion}`
              : ""}
            {data.reviewerName ? ` | Reviewer: ${data.reviewerName}` : ""}
          </Text>
        </View>

        {/* Score */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Score</Text>
          <Text style={[styles.scoreValue, { color: scoreColor(data.score) }]}>
            {data.score !== null ? formatPercent(data.score) : "Not scored"}
          </Text>
          {data.dueDate ? (
            <Text style={{ fontSize: 9, color: "#6b7280", marginTop: 2 }}>
              Due: {formatDate(data.dueDate)}
              {data.completedAt
                ? ` | Completed: ${formatDate(data.completedAt)}`
                : ""}
            </Text>
          ) : null}
        </View>

        {/* Responses */}
        {data.questions.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>
              Responses ({data.questions.length})
            </Text>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>
                <Text style={styles.label}>Question</Text>
              </Text>
              <Text style={styles.col2}>
                <Text style={styles.label}>Answer</Text>
              </Text>
              <Text style={styles.col3}>
                <Text style={styles.label}>Type</Text>
              </Text>
              <Text style={styles.col4}>
                <Text style={styles.label}>Weight</Text>
              </Text>
              <Text style={styles.col5}>
                <Text style={styles.label}>Compliant</Text>
              </Text>
              <Text style={styles.col6}>
                <Text style={styles.label}>Score</Text>
              </Text>
            </View>
            {data.questions.map((question, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.col1}>{question.text}</Text>
                <Text style={styles.col2}>
                  {question.isNa ? "N/A" : question.answer || "--"}
                </Text>
                <Text style={styles.col3}>{question.type}</Text>
                <Text style={styles.col4}>{question.riskWeight}</Text>
                <Text
                  style={[
                    styles.col5,
                    { color: ragColor(question.isCompliant) },
                  ]}
                >
                  {question.isNa
                    ? "N/A"
                    : question.isCompliant === true
                      ? "Yes"
                      : question.isCompliant === false
                        ? "No"
                        : "--"}
                </Text>
                <Text
                  style={[
                    styles.col6,
                    { color: ragColor(question.isCompliant) },
                  ]}
                >
                  {ragLabel(question.scorePct)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Findings */}
        {data.findings.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>
              Findings ({data.findings.length})
            </Text>
            {data.findings.map((finding, i) => (
              <View key={i} style={styles.findingRow}>
                <Text style={styles.findingTitle}>
                  {finding.severity}: {finding.title}
                </Text>
                <Text style={styles.findingMeta}>{finding.description}</Text>
                {finding.controls.length > 0 ? (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      marginTop: 2,
                    }}
                  >
                    {finding.controls.map((code) => (
                      <Text key={code} style={styles.controlChip}>
                        {code}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

export async function generateAssessmentPdf(
  assessmentId: string,
): Promise<Buffer> {
  const { getAssessment } = await import("@/lib/db/assessments");
  const { getOrganizationSettings } = await import("@/lib/settings");

  const [assessment, org] = await Promise.all([
    getAssessment(assessmentId),
    getOrganizationSettings(),
  ]);

  if (!assessment) {
    throw new Error("Assessment not found");
  }

  const questions = assessment.questions.map((question) => {
    const response = assessment.responses.find(
      (res) => res.assessmentQuestionId === question.id,
    );
    const answer = response?.isNotApplicable
      ? "N/A"
      : response?.value !== null && response?.value !== undefined
        ? String(response.value)
        : "--";

    const weight = question.riskWeight;
    const maxScoreMap: Record<string, number> = {
      CRITICAL: 10,
      HIGH: 6,
      MEDIUM: 3,
      LOW: 1,
    };
    const max = maxScoreMap[weight] ?? 0;
    const weighted = response?.weightedScore ?? 0;
    const scorePct =
      response?.isNotApplicable || response?.isCompliant === null
        ? null
        : max > 0
          ? weighted / max
          : null;

    return {
      sectionTitle: question.sectionTitle,
      text: question.text,
      type: question.type,
      riskWeight: weight,
      required: question.required,
      answer,
      isNa: response?.isNotApplicable ?? false,
      isCompliant: response?.isCompliant ?? null,
      scorePct,
    };
  });

  const findings = assessment.findings.map((finding) => ({
    title: finding.title,
    severity: finding.severity,
    controls: finding.controlCodes,
    description: finding.description,
  }));

  const data: AssessmentPdfData = {
    title: assessment.title,
    organizationName: org.name,
    vendorName: assessment.vendor.name,
    vendorContact: assessment.vendor.contactEmail,
    vendorTier: assessment.vendor.tier,
    score: assessment.score,
    dueDate: assessment.dueDate,
    completedAt: assessment.submittedAt,
    reviewerName: assessment.reviewer?.name ?? null,
    templateName: assessment.template?.name ?? null,
    templateVersion: assessment.template?.version ?? null,
    questions,
    findings,
  };

  const pdfBuffer = await renderToBuffer(<AssessmentPdfDocument data={data} />);

  return pdfBuffer;
}
