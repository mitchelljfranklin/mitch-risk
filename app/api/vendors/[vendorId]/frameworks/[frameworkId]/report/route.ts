import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { PERMISSIONS } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { generateFrameworkReportPdf } from "@/lib/framework-report";

const PDF_REPORTS_PER_MIN = 10;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ vendorId: string; frameworkId: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!authResultHasPermission(auth, PERMISSIONS.VENDORS_VIEW)) {
    return new Response("Forbidden", { status: 403 });
  }
  if (
    !rateLimit("pdf-report", auth.userId ?? "anonymous", PDF_REPORTS_PER_MIN)
  ) {
    return new Response("Too many requests â€” try again shortly.", {
      status: 429,
    });
  }

  const { vendorId, frameworkId } = await params;

  try {
    const pdfBuffer = await generateFrameworkReportPdf(vendorId, frameworkId);
    if (pdfBuffer === null) {
      return new Response("Not found", { status: 404 });
    }
    const filename = `compliance-report-${vendorId}-${frameworkId}.pdf`;
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error(
      "Framework report generation failed:",
      error instanceof Error ? error.message : String(error),
    );
    return new Response("Failed to generate report", { status: 500 });
  }
}
