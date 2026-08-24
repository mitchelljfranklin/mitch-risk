import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { generatePortfolioPdf } from "@/lib/portfolio-report";

const PDF_REPORTS_PER_MIN = 10;

export async function GET() {
  const user = await requirePermission(PERMISSIONS.ASSESSMENTS_VIEW);

  if (!rateLimit("pdf-report", user.id, PDF_REPORTS_PER_MIN)) {
    return new Response("Too many requests — try again shortly.", {
      status: 429,
    });
  }

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
