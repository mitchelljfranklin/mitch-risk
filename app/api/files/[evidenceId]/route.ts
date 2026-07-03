import { getCurrentUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getEvidence } from "@/lib/db/assessments";
import { storage } from "@/lib/storage";

const INLINE_SAFE_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

function inlineSafeContentType(mimeType: string): string {
  return INLINE_SAFE_MIME_TYPES.has(mimeType)
    ? mimeType
    : "application/octet-stream";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ evidenceId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!hasPermission(user.permissions, PERMISSIONS.ASSESSMENTS_VIEW)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { evidenceId } = await params;
  const evidence = await getEvidence(evidenceId);
  if (!evidence) {
    return new Response("Not found", { status: 404 });
  }

  let data: Buffer;
  try {
    data = await storage.read(evidence.storageKey);
  } catch {
    return new Response("File not found", { status: 404 });
  }

  const isInline = new URL(request.url).searchParams.get("inline") === "true";
  const contentType = isInline
    ? inlineSafeContentType(evidence.mimeType)
    : "application/octet-stream";

  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": isInline
        ? `inline; filename="${encodeURIComponent(evidence.fileName)}"`
        : `attachment; filename="${encodeURIComponent(evidence.fileName)}"`,
      "Content-Length": String(evidence.sizeBytes),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
