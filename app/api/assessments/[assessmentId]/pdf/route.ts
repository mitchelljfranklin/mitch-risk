import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { PERMISSIONS } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { generateAssessmentPdf } from "@/lib/pdf-report";

const PDF_REPORTS_PER_MIN = 10;

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
  if (
    !rateLimit("pdf-report", auth.userId ?? "anonymous", PDF_REPORTS_PER_MIN)
  ) {
    return new Response("Too many requests â€” try again shortly.", {
      status: 429,
    });
  }

  const { assessmentId } = await params;

  try {
    const pdfBuffer = await generateAssessmentPdf(assessmentId);
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="assessment-${assessmentId}.pdf"`,
      },
    });
  } catch (error) {
    if ((error as Error).message === "Assessment not found") {
      return new Response("Not found", { status: 404 });
    }
    throw error;
  }
}
