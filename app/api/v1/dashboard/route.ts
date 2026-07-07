import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { apiError, runApiHandler } from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { getDashboardData } from "@/lib/db/compliance";

export async function GET(request: Request) {
  return runApiHandler(async () => {
    const auth = await authenticateRequest(request);
    if (!auth) return apiError("Unauthorized", 401);
    if (!authResultHasPermission(auth, PERMISSIONS.ASSESSMENTS_VIEW))
      return apiError("Forbidden", 403);

    void request;
    const data = await getDashboardData();
    return Response.json(data);
  });
}
