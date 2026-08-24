import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { PERMISSIONS } from "@/lib/permissions";
import spec from "@/lib/openapi.json";

const SPEC = {
  ...spec,
  servers: [
    {
      url: process.env.APP_URL ?? "http://localhost:3000",
      description: "mitch-risk API server",
    },
  ],
};

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!authResultHasPermission(auth, PERMISSIONS.API_MANAGE)) {
    return new Response("Forbidden", { status: 403 });
  }
  return Response.json(SPEC);
}
