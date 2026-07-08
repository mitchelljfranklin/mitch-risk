import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { apiError, runApiHandler } from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { getVendorForExport } from "@/lib/db/vendors";
import {
  CERTIFICATION_STATUS_LABELS,
  certificationStatus,
} from "@/lib/schemas/certification";
import { DATA_SENSITIVITY_LABELS } from "@/lib/schemas/vendor";
import { csvEscape } from "@/lib/utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  return runApiHandler(async () => {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return apiError("Unauthorized", 401);
    }
    if (!authResultHasPermission(auth, PERMISSIONS.VENDORS_VIEW)) {
      return apiError("Forbidden", 403);
    }

    const { vendorId } = await params;
    const vendor = await getVendorForExport(vendorId);
    if (!vendor) {
      return apiError("Not found", 404);
    }

    return buildVendorCsvResponse(vendor);
  });
}

function buildVendorCsvResponse(
  vendor: NonNullable<Awaited<ReturnType<typeof getVendorForExport>>>,
): Response {
  const header = [
    csvEscape("Assessment Title"),
    csvEscape("Status"),
    csvEscape("Score"),
    csvEscape("Submitted"),
    csvEscape("Due Date"),
    csvEscape("Template"),
  ].join(",");

  const rows = vendor.assessments.map((a) =>
    [
      csvEscape(a.title),
      csvEscape(a.status),
      a.score !== null ? Math.round(a.score * 100) + "%" : "",
      csvEscape(a.submittedAt?.toISOString().slice(0, 10) ?? ""),
      csvEscape(a.dueDate?.toISOString().slice(0, 10) ?? ""),
      csvEscape(
        a.template?.name ? `${a.template.name} v${a.template.version}` : "",
      ),
    ].join(","),
  );

  const summary = [
    `Vendor:,${csvEscape(vendor.name)}`,
    `Contact:,${csvEscape(vendor.contactEmail ?? "")}`,
    `Tier:,${csvEscape(vendor.tier ?? "")}`,
    `Owner:,${csvEscape(vendor.owner?.name ?? "")}`,
    `Service provided:,${csvEscape(vendor.serviceDescription ?? "")}`,
    `Data sensitivity:,${csvEscape(
      vendor.dataSensitivity
        ? DATA_SENSITIVITY_LABELS[vendor.dataSensitivity]
        : "",
    )}`,
    `Contract renewal:,${csvEscape(
      vendor.contractRenewalDate?.toISOString().slice(0, 10) ?? "",
    )}`,
    `Overall Score:,${vendor.overallScore !== null ? Math.round(vendor.overallScore * 100) + "%" : ""}`,
    "",
  ].join("\n");

  const certHeader = [
    csvEscape("Certification"),
    csvEscape("Issuer"),
    csvEscape("Issued"),
    csvEscape("Expires"),
    csvEscape("Status"),
  ].join(",");
  const certRows = vendor.certifications.map((cert) =>
    [
      csvEscape(cert.name),
      csvEscape(cert.issuer ?? ""),
      csvEscape(cert.issuedDate?.toISOString().slice(0, 10) ?? ""),
      csvEscape(cert.expiresDate.toISOString().slice(0, 10)),
      csvEscape(
        CERTIFICATION_STATUS_LABELS[certificationStatus(cert.expiresDate)],
      ),
    ].join(","),
  );

  const csv = [
    summary,
    "Assessments",
    header,
    ...rows,
    "",
    "Certifications",
    certHeader,
    ...certRows,
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(vendor.name.replaceAll(" ", "-") + ".csv")}"`,
    },
  });
}
