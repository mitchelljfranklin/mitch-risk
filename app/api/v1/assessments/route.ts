import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { apiError, runApiHandler } from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { listAssessments } from "@/lib/db/assessments";

export async function GET(request: Request) {
  return runApiHandler(async () => {
    const auth = await authenticateRequest(request);
    if (!auth) return apiError("Unauthorized", 401);
    if (!authResultHasPermission(auth, PERMISSIONS.ASSESSMENTS_VIEW))
      return apiError("Forbidden", 403);

    const { searchParams } = new URL(request.url);

    const { assessments, totalCount, page, pageSize } = await listAssessments({
      query: searchParams.get("query") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      vendorId: searchParams.get("vendorId") ?? undefined,
      fromDate: searchParams.get("fromDate") ?? undefined,
      toDate: searchParams.get("toDate") ?? undefined,
      overdue: searchParams.get("overdue") === "true" ? true : undefined,
      page: searchParams.get("page")
        ? Number(searchParams.get("page"))
        : undefined,
    });

    const format = searchParams.get("format") ?? "json";

    const entries = assessments.map((a) => ({
      id: a.id,
      title: a.title,
      vendorId: a.vendorId,
      vendorName: a.vendor.name,
      status: a.status,
      score: a.score,
      dueDate: a.dueDate,
      sentAt: a.sentAt,
      submittedAt: a.submittedAt,
      templateName: a.template?.name ?? null,
      templateVersion: a.template?.version ?? null,
      reviewerName: a.reviewer?.name ?? null,
    }));

    if (format === "csv") {
      const headers = [
        "id",
        "title",
        "vendorName",
        "status",
        "score",
        "dueDate",
        "sentAt",
        "submittedAt",
        "templateName",
        "reviewerName",
      ];
      const csvRows = entries.map((e) =>
        headers
          .map((h) => {
            const val = e[h as keyof typeof e];
            if (val === null || val === undefined) return "";
            const str = String(val);
            return str.includes(",") || str.includes('"')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(","),
      );
      const csv = [headers.join(","), ...csvRows].join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=assessments.csv",
        },
      });
    }

    return Response.json({ entries, page, pageSize, totalCount });
  });
}
