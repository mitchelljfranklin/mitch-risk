import { getCurrentUser } from "@/lib/auth";
import { getEvidence } from "@/lib/db/assessments";
import { storage } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ evidenceId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
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

  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": evidence.mimeType,
      "Content-Disposition": isInline
        ? `inline; filename="${encodeURIComponent(evidence.fileName)}"`
        : `attachment; filename="${encodeURIComponent(evidence.fileName)}"`,
      "Content-Length": String(evidence.sizeBytes),
    },
  });
}
