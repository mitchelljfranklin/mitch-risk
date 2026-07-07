import { describe, expect, it } from "vitest";

import {
  isDangerousUploadMime,
  validateMagicBytes,
} from "@/lib/upload-validation";

const FAKE_PDF = Buffer.from("%PDF-1.4\ntrailer");
const FAKE_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);
const FAKE_JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const FAKE_GIF = Buffer.from("GIF89a\x00\x00");
const FAKE_DOCX = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
const FAKE_WEBP = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

describe("validateMagicBytes", () => {
  it("accepts a valid PDF", () => {
    expect(validateMagicBytes("pdf", FAKE_PDF)).toBe(true);
  });

  it("accepts a valid PNG", () => {
    expect(validateMagicBytes("png", FAKE_PNG)).toBe(true);
  });

  it("accepts a valid JPEG", () => {
    expect(validateMagicBytes("jpg", FAKE_JPG)).toBe(true);
    expect(validateMagicBytes("jpeg", FAKE_JPG)).toBe(true);
  });

  it("accepts a valid GIF", () => {
    expect(validateMagicBytes("gif", FAKE_GIF)).toBe(true);
  });

  it("accepts a valid DOCX (ZIP-based format)", () => {
    expect(validateMagicBytes("docx", FAKE_DOCX)).toBe(true);
  });

  it("accepts a valid XLSX (ZIP-based format)", () => {
    expect(validateMagicBytes("xlsx", FAKE_DOCX)).toBe(true);
  });

  it("accepts a valid WebP", () => {
    expect(validateMagicBytes("webp", FAKE_WEBP)).toBe(true);
  });

  it("rejects a PDF renamed as PNG", () => {
    expect(validateMagicBytes("png", FAKE_PDF)).toBe(false);
  });

  it("rejects a PNG renamed as PDF", () => {
    expect(validateMagicBytes("pdf", FAKE_PNG)).toBe(false);
  });

  it("rejects a JPEG renamed as DOCX", () => {
    expect(validateMagicBytes("docx", FAKE_JPG)).toBe(false);
  });

  it("rejects an HTML file renamed as PDF", () => {
    const htmlAsPdf = Buffer.from("<html><body>malicious</body></html>");
    expect(validateMagicBytes("pdf", htmlAsPdf)).toBe(false);
  });

  it("rejects a WebP file with correct RIFF but wrong subtype", () => {
    const badWebp = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x58, 0x58, 0x58, 0x58,
    ]);
    expect(validateMagicBytes("webp", badWebp)).toBe(false);
  });

  it("rejects a file too short for its expected signature", () => {
    expect(validateMagicBytes("png", Buffer.from([0x89]))).toBe(false);
    expect(validateMagicBytes("pdf", Buffer.from([0x25]))).toBe(false);
  });

  it("returns true for unknown extensions (pass-through)", () => {
    expect(validateMagicBytes("txt", Buffer.from("hello world"))).toBe(true);
    expect(validateMagicBytes("csv", Buffer.from("a,b,c"))).toBe(true);
  });
});

describe("isDangerousUploadMime", () => {
  it("flags script-renderable types that can carry stored XSS", () => {
    expect(isDangerousUploadMime("text/html")).toBe(true);
    expect(isDangerousUploadMime("image/svg+xml")).toBe(true);
    expect(isDangerousUploadMime("application/javascript")).toBe(true);
  });

  it("is case- and whitespace-insensitive", () => {
    expect(isDangerousUploadMime("  TEXT/HTML ")).toBe(true);
  });

  it("allows ordinary evidence document and image types", () => {
    expect(isDangerousUploadMime("application/pdf")).toBe(false);
    expect(isDangerousUploadMime("image/png")).toBe(false);
    expect(isDangerousUploadMime("application/octet-stream")).toBe(false);
    expect(
      isDangerousUploadMime(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe(false);
  });
});
