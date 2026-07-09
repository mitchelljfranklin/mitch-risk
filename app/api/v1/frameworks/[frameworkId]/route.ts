import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { apiError, runApiHandler } from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import {
  deleteFramework,
  getFramework,
  listControls,
} from "@/lib/db/frameworks";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ frameworkId: string }> },
) {
  return runApiHandler(async () => {
    const auth = await authenticateRequest(request);
    if (!auth) return apiError("Unauthorized", 401);
    if (!authResultHasPermission(auth, PERMISSIONS.FRAMEWORKS_VIEW))
      return apiError("Forbidden", 403);

    const { frameworkId } = await params;
    const framework = await getFramework(frameworkId);
    if (!framework) return apiError("Not found", 404);

    const { searchParams } = new URL(request.url);
    const controls = await listControls(
      frameworkId,
      searchParams.get("search") ?? undefined,
    );

    return Response.json({
      id: framework.id,
      name: framework.name,
      version: framework.version,
      description: framework.description,
      controls: controls.map((control) => ({
        id: control.id,
        domain: control.domain,
        code: control.code,
        title: control.title,
        guidance: control.guidance,
        order: control.order,
      })),
    });
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ frameworkId: string }> },
) {
  return runApiHandler(async () => {
    const auth = await authenticateRequest(request);
    if (!auth) return apiError("Unauthorized", 401);
    if (!authResultHasPermission(auth, PERMISSIONS.FRAMEWORKS_DELETE))
      return apiError("Forbidden", 403);

    const { frameworkId } = await params;
    const framework = await getFramework(frameworkId);
    if (!framework) return apiError("Not found", 404);

    await deleteFramework(frameworkId);
    return new Response(null, { status: 204 });
  });
}
