import { getAppearanceSettings } from "@/lib/settings";
import { storage } from "@/lib/storage";

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
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

    const ext = appearance.logoKey.split(".").pop()?.toLowerCase() ?? "png";
    const contentType = MIME_TYPES[ext] ?? "image/png";

    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error reading logo:", error);
    return new Response("Error reading logo", { status: 500 });
  }
}
