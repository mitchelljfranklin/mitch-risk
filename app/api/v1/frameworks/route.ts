import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { apiError, runApiHandler } from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { listFrameworks } from "@/lib/db/frameworks";

export async function GET(request: Request) {
  return runApiHandler(async () => {
    const auth = await authenticateRequest(request);
    if (!auth) return apiError("Unauthorized", 401);
    if (!authResultHasPermission(auth, PERMISSIONS.FRAMEWORKS_VIEW))
      return apiError("Forbidden", 403);

    const frameworks = await listFrameworks();

    return Response.json(
      frameworks.map((f) => ({
        id: f.id,
        name: f.name,
        version: f.version,
        description: f.description,
        controlCount: f._count.controls,
      })),
    );
  });
}
