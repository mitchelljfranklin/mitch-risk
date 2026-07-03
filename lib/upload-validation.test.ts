import { describe, expect, it } from "vitest";

import { isDangerousUploadMime } from "@/lib/upload-validation";

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
