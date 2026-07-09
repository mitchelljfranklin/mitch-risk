import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { QUESTION_TYPE_LABELS } from "@/lib/schemas/template";
import { csvEscape } from "@/lib/utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!authResultHasPermission(auth, PERMISSIONS.ASSESSMENTS_VIEW)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { assessmentId } = await params;

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      vendor: { select: { name: true } },
      questions: { orderBy: { order: "asc" }, include: { response: true } },
      findings: { orderBy: { severity: "asc" } },
    },
  });

  if (!assessment) {
    return new Response("Not found", { status: 404 });
  }

  function complianceLabel(isCompliant: boolean | null): string {
    if (isCompliant === null) return "Unscored";
    if (isCompliant) return "Yes";
    return "No";
  }

  const rows: string[] = [];
  rows.push(
    [
      "Section",
      "Question",
      "Type",
      "Risk Weight",
      "Required",
      "Answer",
      "N/A",
      "Compliant",
      "Score %",
    ]
      .map((header) => csvEscape(header))
      .join(","),
  );

  for (const question of assessment.questions) {
    const response = question.response;
    const maxScore = response?.maxScore ?? 0;
    const weightedScore = response?.weightedScore ?? 0;
    const ratio =
      maxScore > 0 ? Math.round((weightedScore / maxScore) * 100) : "";

    rows.push(
      [
        question.sectionTitle,
        question.text,
        QUESTION_TYPE_LABELS[question.type] ?? question.type,
        question.riskWeight,
        question.required ? "Yes" : "No",
        response?.isNotApplicable ? "N/A" : String(response?.value ?? "—"),
        response?.isNotApplicable ? "Yes" : "No",
        complianceLabel(response?.isCompliant ?? null),
        ratio,
      ]
        .map((cell) => csvEscape(cell))
        .join(","),
    );
  }

  rows.push("");

  rows.push(
    ["Findings", "Severity", "Controls", "Description"]
      .map((header) => csvEscape(header))
      .join(","),
  );

  for (const finding of assessment.findings) {
    rows.push(
      [finding.title, finding.severity, finding.controlCodes.join("; "), finding.description]
        .map((cell) => csvEscape(cell))
        .join(","),
    );
  }

  const filename = `${assessment.vendor.name.replaceAll(" ", "-")}-assessment.csv`;

  return new Response(rows.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
