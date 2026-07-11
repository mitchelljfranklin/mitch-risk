import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { generatePortfolioPdf } from "@/lib/portfolio-report";

export async function GET() {
  await requirePermission(PERMISSIONS.ASSESSMENTS_VIEW);

  try {
    const pdfBuffer = await generatePortfolioPdf();
    const filename = `portfolio-report-${new Date().toISOString().slice(0, 10)}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error(
      "Portfolio report generation failed:",
      error instanceof Error ? error.message : String(error),
    );
    return new Response("Failed to generate report", { status: 500 });
  }
}
