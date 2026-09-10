import { storage } from "@/lib/storage";
import { getPublishedTrustCenterBadgeImage } from "@/lib/db/trust-center";

// Raster-only MIME map: badge images are uploaded through the same
// SVG-refusing validation as the brand logo, and this route defensively
// refuses to serve anything it cannot map to a known-safe image type.
const IMAGE_MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const badge = await getPublishedTrustCenterBadgeImage(id);
  if (!badge) {
    return new Response("Not found", { status: 404 });
  }

  const ext = badge.imageKey.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = IMAGE_MIME_BY_EXT[ext];
  // Unrecognised extension on a published badge means the stored key was
  // written outside the upload validation - refuse rather than guess.
  if (!mimeType) {
    return new Response("Not found", { status: 404 });
  }

  let file: Buffer;
  try {
    file = await storage.read(badge.imageKey);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(file.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
