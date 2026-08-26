import { getAppearanceSettings } from "@/lib/settings";
import { storage } from "@/lib/storage";

// Raster types only, matching the upload allowlist. SVG is deliberately
// absent: it is scriptable and this route serves content inline on origin.
const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

export async function GET() {
  const appearance = await getAppearanceSettings();
  if (!appearance.logoKey) {
    return new Response("No logo configured", { status: 404 });
  }

  try {
    const file = await storage.read(appearance.logoKey);
    if (!file) {
      return new Response("Logo not found", { status: 404 });
    }

    const ext = appearance.logoKey.split(".").pop()?.toLowerCase() ?? "";
    // Unmapped extensions (e.g. legacy svg uploads) are refused rather than
    // served with a guessed content type.
    const contentType = MIME_TYPES[ext];
    if (!contentType) {
      return new Response("Logo not found", { status: 404 });
    }

    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error(
      "Error reading logo:",
      error instanceof Error ? error.message : String(error),
    );
    return new Response("Error reading logo", { status: 500 });
  }
}
