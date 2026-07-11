import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

const INLINE_SAFE_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;

  await requirePermission(PERMISSIONS.VENDORS_VIEW);

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
  });
  if (!attachment) {
    return new Response("Attachment not found", { status: 404 });
  }

  try {
    const file = await storage.read(attachment.storageKey);
    if (!file) {
      return new Response("File not found", { status: 404 });
    }

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
      },
    });
  } catch (error) {
    console.error(
      `Error reading attachment ${attachmentId}:`,
      error instanceof Error ? error.message : String(error),
    );
    return new Response("Error reading file", { status: 500 });
  }
}
