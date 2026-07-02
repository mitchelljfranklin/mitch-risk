import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getVendorProfile } from "@/lib/db/compliance";
import { getVendor } from "@/lib/db/vendors";

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
    tier: vendor.tier,
    overallScore: vendor.overallScore,
    lastAssessedAt: vendor.lastAssessedAt,
    assessmentCount: profile?.history.length ?? 0,
    latestScore: profile?.history[0]?.score ?? null,
    domainBreakdown: profile?.domainBreakdown ?? [],
  });
}
