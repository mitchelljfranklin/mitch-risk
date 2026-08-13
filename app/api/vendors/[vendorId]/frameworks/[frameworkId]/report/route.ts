import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { PERMISSIONS } from "@/lib/permissions";
import { generateFrameworkReportPdf } from "@/lib/framework-report";

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

  const { vendorId, frameworkId } = await params;

  try {
    const pdfBuffer = await generateFrameworkReportPdf(vendorId, frameworkId);
    const filename = `compliance-report-${vendorId}-${frameworkId}.pdf`;
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if ((error as Error).message === "Vendor or framework not found") {
      return new Response("Not found", { status: 404 });
    }
    throw error;
  }
}
