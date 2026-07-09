import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { apiError, runApiHandler } from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { getVendor } from "@/lib/db/vendors";
import { listVendorCertifications } from "@/lib/db/certifications";
import { listAttachments } from "@/lib/db/certifications";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  return runApiHandler(async () => {
    const auth = await authenticateRequest(request);
    if (!auth) return apiError("Unauthorized", 401);
    if (!authResultHasPermission(auth, PERMISSIONS.VENDORS_VIEW))
      return apiError("Forbidden", 403);

    const { vendorId } = await params;
    const vendor = await getVendor(vendorId);
    if (!vendor) return apiError("Not found", 404);

    const certifications = await listVendorCertifications(vendorId);

    const entries = await Promise.all(
      certifications.map(async (cert) => {
        const attachments = await listAttachments(
          "VendorCertification",
          cert.id,
        );
        return {
          id: cert.id,
          name: cert.name,
          issuer: cert.issuer,
          issuedDate: cert.issuedDate,
          expiresDate: cert.expiresDate,
          notes: cert.notes,
          attachmentCount: attachments.length,
          attachments: attachments.map((attachment) => ({
            id: attachment.id,
            fileName: attachment.fileName,
            displayName: attachment.displayName,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
          })),
        };
      }),
    );

    return Response.json({ vendorId, vendorName: vendor.name, entries });
  });
}
