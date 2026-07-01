import { getAppearanceSettings } from "@/lib/settings";
import { storage } from "@/lib/storage";

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

    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Error reading logo", { status: 500 });
  }
}
