import { storage } from "@/lib/storage";
import { getPublishedTrustCenterSubprocessorLogo } from "@/lib/db/trust-center";

// Raster-only MIME map: subprocessor logos are uploaded through the same
// SVG-refusing validation as badges, and this route defensively refuses to
// serve anything it cannot map to a known-safe image type.
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

  const subprocessor = await getPublishedTrustCenterSubprocessorLogo(id);
  if (!subprocessor) {
    return new Response("Not found", { status: 404 });
  }

  const ext = subprocessor.logoKey.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = IMAGE_MIME_BY_EXT[ext];
  if (!mimeType) {
    return new Response("Not found", { status: 404 });
  }

  let file: Buffer;
  try {
    file = await storage.read(subprocessor.logoKey);
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
