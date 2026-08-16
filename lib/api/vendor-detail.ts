import { getVendor } from "@/lib/db/vendors";
import { getVendorProfile } from "@/lib/db/compliance";
import { getCustomerResponsibilityCompliance } from "@/lib/db/customer-responsibility";

type VendorWithRelations = NonNullable<Awaited<ReturnType<typeof getVendor>>>;

export function buildVendorDetailResponse(
  vendor: VendorWithRelations,
  profile: Awaited<ReturnType<typeof getVendorProfile>>,
  responsibilityCompliance: Awaited<
    ReturnType<typeof getCustomerResponsibilityCompliance>
  >,
) {
  return {
    id: vendor.id,
    name: vendor.name,
    externalId: vendor.externalId,
    contactName: vendor.contactName,
    contactEmail: vendor.contactEmail,
    tier: vendor.tier,
    website: vendor.website,
    notes: vendor.notes,
    overallScore: vendor.overallScore,
    lastAssessedAt: vendor.lastAssessedAt,
    contractValue: vendor.contractValue,
    geographicRisk: vendor.geographicRisk,
    tags: vendor.tags ?? [],
    assessments: vendor.assessments.map((assessment) => ({
      id: assessment.id,
      title: assessment.title,
      status: assessment.status,
      score: assessment.score,
      templateName: assessment.template?.name ?? null,
      templateVersion: assessment.template?.version ?? null,
    })),
    domainBreakdown: profile?.domainBreakdown ?? [],
    history: profile?.history ?? [],
    customerResponsibilityCompliance: responsibilityCompliance,
  };
}
