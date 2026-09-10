import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { getPublishedTrustCenterDocument } from "@/lib/db/trust-center";
import { getTrustCenterSettings } from "@/lib/settings";
import { storage } from "@/lib/storage";

const INLINE_SAFE_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const clientIp = getClientIp(request.headers);
  const settings = await getTrustCenterSettings();

  // Disabled or rate-limited both return the same neutral 404 — no signal
  // that a trust center exists.
  if (!settings.enabled) {
    return new Response("Not found", { status: 404 });
  }
  if (!rateLimit("trust-download", clientIp, settings.downloadsPerMin)) {
    return new Response("Not found", { status: 404 });
  }

  const result = await getPublishedTrustCenterDocument(id);
  if (!result) {
    return new Response("Not found", { status: 404 });
  }

  const { attachment } = result;

  let file: Buffer;
  try {
    file = await storage.read(attachment.storageKey);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  // Same safe-inline coercion as the authenticated attachment route: browsers
  // render only the listed types; everything else forces a download.
  const isInline = INLINE_SAFE_MIME_TYPES.includes(attachment.mimeType);

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": isInline
        ? attachment.mimeType
        : "application/octet-stream",
      "Content-Disposition": isInline
        ? "inline"
        : `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
      "Content-Length": String(file.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
