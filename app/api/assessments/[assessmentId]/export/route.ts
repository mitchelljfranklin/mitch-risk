import { authenticateRequest } from "@/lib/api-auth";
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
      .map((h) => csvEscape(h))
      .join(","),
  );

  for (const q of assessment.questions) {
    const r = q.response;
    const maxScore = r?.maxScore ?? 0;
    const weightedScore = r?.weightedScore ?? 0;
    const ratio =
      maxScore > 0 ? Math.round((weightedScore / maxScore) * 100) : "";

    rows.push(
      [
        q.sectionTitle,
        q.text,
        QUESTION_TYPE_LABELS[q.type] ?? q.type,
        q.riskWeight,
        q.required ? "Yes" : "No",
        r?.isNotApplicable ? "N/A" : String(r?.value ?? "—"),
        r?.isNotApplicable ? "Yes" : "No",
        r?.isCompliant === null ? "Unscored" : r?.isCompliant ? "Yes" : "No",
        ratio,
      ]
        .map((v) => csvEscape(v))
        .join(","),
    );
  }

  rows.push("");
  rows.push(
    ["Findings", "Severity", "Controls", "Description"]
      .map((h) => csvEscape(h))
      .join(","),
  );

  for (const f of assessment.findings) {
    rows.push(
      [f.title, f.severity, f.controlCodes.join("; "), f.description]
        .map((v) => csvEscape(v))
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
