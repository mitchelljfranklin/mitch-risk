import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { PERMISSIONS } from "@/lib/permissions";
import spec from "@/lib/openapi.json";

const RAW_APP_URL = process.env.APP_URL ?? "http://localhost:3000";
// Swagger "Try it out" concatenates servers[].url with each path (e.g.
// /v1/vendors). The spec's paths are relative to /api, so the served server
// URL must carry that prefix or every interactive request 404s.
const SPEC = {
  ...spec,
  servers: [
    {
      url: `${RAW_APP_URL.replace(/\/+$/, "")}/api`,
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
