import { authenticateRequest } from "@/lib/api-auth";
import { generateAssessmentPdf } from "@/lib/pdf-report";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return new Response("Unauthorized", { status: 401 });
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
