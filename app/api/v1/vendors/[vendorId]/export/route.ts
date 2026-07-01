import { authenticateRequest } from "@/lib/api-auth";
import { getVendorForExport } from "@/lib/db/vendors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  const auth = await authenticateRequest(_request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { vendorId } = await params;
  const vendor = await getVendorForExport(vendorId);
  if (!vendor) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const data = {
    name: vendor.name,
    contactName: vendor.contactName,
    contactEmail: vendor.contactEmail,
    tier: vendor.tier,
    website: vendor.website,
    notes: vendor.notes,
    overallScore: vendor.overallScore,
    lastAssessedAt: vendor.lastAssessedAt,
    assessments: vendor.assessments.map((a) => ({
      title: a.title,
      status: a.status,
      score: a.score,
      submittedAt: a.submittedAt,
      dueDate: a.dueDate,
      templateName: a.template?.name ?? null,
      templateVersion: a.template?.version ?? null,
    })),
  };

  return Response.json(data, {
    headers: {
      "Content-Disposition": `attachment; filename="${vendor.name.replaceAll(" ", "-")}.json"`,
    },
  });
}
