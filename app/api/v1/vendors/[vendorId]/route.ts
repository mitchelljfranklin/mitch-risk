import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getVendor } from "@/lib/db/vendors";
import { getVendorProfile } from "@/lib/db/compliance";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  const auth = await authenticateRequest(_request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!authResultHasPermission(auth, PERMISSIONS.VENDORS_VIEW)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { vendorId } = await params;
  const vendor = await getVendor(vendorId);
  if (!vendor) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const profile = await getVendorProfile(vendorId);

  return Response.json({
    id: vendor.id,
    name: vendor.name,
    contactName: vendor.contactName,
    contactEmail: vendor.contactEmail,
    tier: vendor.tier,
    website: vendor.website,
    notes: vendor.notes,
    overallScore: vendor.overallScore,
    lastAssessedAt: vendor.lastAssessedAt,
    assessments: vendor.assessments.map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      score: a.score,
      templateName: a.template?.name ?? null,
      templateVersion: a.template?.version ?? null,
    })),
    domainBreakdown: profile?.domainBreakdown ?? [],
    history: profile?.history ?? [],
  });
}
