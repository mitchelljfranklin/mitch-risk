import { authenticateRequest } from "@/lib/api-auth";
import { listVendors } from "@/lib/db/vendors";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const vendors = await listVendors({
    query: searchParams.get("query") ?? undefined,
    tier: searchParams.get("tier") ?? undefined,
  });

  return Response.json(
    vendors.map((v) => ({
      id: v.id,
      name: v.name,
      contactName: v.contactName,
      contactEmail: v.contactEmail,
      tier: v.tier,
      website: v.website,
      overallScore: v.overallScore,
      lastAssessedAt: v.lastAssessedAt,
      assessmentCount: v._count.assessments,
    })),
  );
}
