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
