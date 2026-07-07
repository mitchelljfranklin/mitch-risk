const DANGEROUS_UPLOAD_MIME_TYPES = new Set([
  "text/html",
  "application/xhtml+xml",
  "image/svg+xml",
  "application/javascript",
  "text/javascript",
  "application/x-httpd-php",
  "application/xml",
  "text/xml",
  "application/x-msdownload",
  "application/x-sh",
]);

export const ALLOWED_ATTACHMENT_EXTS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "docx",
  "xlsx",
];

export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export function isDangerousUploadMime(mimeType: string): boolean {
  return DANGEROUS_UPLOAD_MIME_TYPES.has(mimeType.trim().toLowerCase());
}

const COMPACT_PDF = Buffer.from([0x25, 0x50, 0x44, 0x46]);

const RIFF_HEADER = Buffer.from([0x52, 0x49, 0x46, 0x46]);

const MAGIC_BYTES: Record<string, { bytes: Buffer; offset?: number }> = {
  pdf: { bytes: COMPACT_PDF },
  png: {
    bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  jpg: { bytes: Buffer.from([0xff, 0xd8, 0xff]) },
  jpeg: { bytes: Buffer.from([0xff, 0xd8, 0xff]) },
  gif: {
    bytes: Buffer.from([0x47, 0x49, 0x46, 0x38]),
  },
  webp: {
    bytes: RIFF_HEADER,
    offset: 8,
  },
  docx: { bytes: Buffer.from([0x50, 0x4b, 0x03, 0x04]) },
  xlsx: { bytes: Buffer.from([0x50, 0x4b, 0x03, 0x04]) },
};

const WEBP_RIFF_SUBTYPE = Buffer.from("WEBP");

function compareMagic(
  buffer: Buffer,
  signature: Buffer,
  offset: number,
): boolean {
  if (buffer.length < offset + signature.length) {
    return false;
  }
  return signature.every((byte, index) => buffer[offset + index] === byte);
}

export function validateMagicBytes(extension: string, buffer: Buffer): boolean {
  const lowerExt = extension.toLowerCase();

  if (lowerExt === "webp") {
    return (
      compareMagic(buffer, RIFF_HEADER, 0) &&
      compareMagic(buffer, WEBP_RIFF_SUBTYPE, 8)
    );
  }

  const signature = MAGIC_BYTES[lowerExt];
  if (!signature) {
    return true;
  }

  return compareMagic(buffer, signature.bytes, signature.offset ?? 0);
}
