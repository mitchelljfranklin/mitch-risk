import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { apiError, runApiHandler } from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { getVendorForExport } from "@/lib/db/vendors";
import {
  CERTIFICATION_STATUS_LABELS,
  certificationStatus,
  CUSTOMER_RESPONSIBILITY_STATUS_LABELS,
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

  const rows = vendor.assessments.map((assessment) =>
    [
      csvEscape(assessment.title),
      csvEscape(assessment.status),
      assessment.score !== null ? Math.round(assessment.score * 100) + "%" : "",
      csvEscape(assessment.submittedAt?.toISOString().slice(0, 10) ?? ""),
      csvEscape(assessment.dueDate?.toISOString().slice(0, 10) ?? ""),
      csvEscape(
        assessment.template?.name
          ? `${assessment.template.name} v${assessment.template.version}`
          : "",
      ),
    ].join(","),
  );

  const responsibilityActions = vendor.responsibilityActions ?? [];
  const completedResponsibility = responsibilityActions.filter(
    (action) =>
      action.status === "COMPLETED" || action.status === "NOT_APPLICABLE",
  ).length;
  const responsibilityPercent =
    responsibilityActions.length > 0
      ? `${Math.round((completedResponsibility / responsibilityActions.length) * 100)}%`
      : "";

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
    `Contract value:,${csvEscape(vendor.contractValue ?? "")}`,
    `Geographic risk:,${csvEscape(vendor.geographicRisk ?? "")}`,
    `Tags:,${csvEscape(vendor.tags?.length ? vendor.tags.join(", ") : "")}`,
    `Overall Score:,${vendor.overallScore !== null ? Math.round(vendor.overallScore * 100) + "%" : ""}`,
    `Responsibility Compliance:,${responsibilityPercent} (${completedResponsibility}/${responsibilityActions.length})`,
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

  const respHeader = [
    csvEscape("Control Code"),
    csvEscape("Control Title"),
    csvEscape("Framework"),
    csvEscape("Status"),
    csvEscape("Assigned To"),
    csvEscape("Notes"),
    csvEscape("Completed"),
  ].join(",");
  const respRows = responsibilityActions.map((action) =>
    [
      csvEscape(action.controlCode),
      csvEscape(action.controlTitle),
      csvEscape(action.frameworkName),
      csvEscape(
        CUSTOMER_RESPONSIBILITY_STATUS_LABELS[
          action.status as keyof typeof CUSTOMER_RESPONSIBILITY_STATUS_LABELS
        ] ?? action.status,
      ),
      csvEscape(action.assignedTo?.name ?? ""),
      csvEscape(action.notes ?? ""),
      csvEscape(action.completedAt?.toISOString().slice(0, 10) ?? ""),
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
    "",
    "Customer Responsibility",
    respHeader,
    ...respRows,
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(vendor.name.replaceAll(" ", "-") + ".csv")}"`,
    },
  });
}
