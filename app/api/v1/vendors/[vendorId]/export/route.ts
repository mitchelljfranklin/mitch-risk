import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getVendorForExport } from "@/lib/db/vendors";
import { csvEscape } from "@/lib/utils";

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
  const vendor = await getVendorForExport(vendorId);
  if (!vendor) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

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
    `Overall Score:,${vendor.overallScore !== null ? Math.round(vendor.overallScore * 100) + "%" : ""}`,
    "",
  ].join("\n");

  const csv = [summary, header, ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${vendor.name.replaceAll(" ", "-")}.csv"`,
    },
  });
}
