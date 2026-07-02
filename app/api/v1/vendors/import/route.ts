import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { PERMISSIONS } from "@/lib/permissions";
import { createVendor } from "@/lib/db/vendors";
import { vendorSchema } from "@/lib/schemas/vendor";

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!authResultHasPermission(auth, PERMISSIONS.VENDORS_CREATE)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return Response.json(
      { error: "Invalid vendor structure." },
      { status: 400 },
    );
  }

  const record = data as Record<string, unknown>;
  const parsed = vendorSchema.safeParse({
    name: record.name ?? "",
    contactName: record.contactName ?? "",
    contactEmail: record.contactEmail ?? "",
    tier: record.tier ?? "",
    website: record.website ?? "",
    notes: record.notes ?? "",
  });

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid vendor data." },
      { status: 400 },
    );
  }

  const vendor = await createVendor(parsed.data);
  return Response.json(vendor, { status: 201 });
}
