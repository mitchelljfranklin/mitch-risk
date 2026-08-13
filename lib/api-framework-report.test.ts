import { describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/lib/permissions";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/api-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-auth")>();
  return { ...actual, authenticateRequest: vi.fn() };
});

vi.mock("@/lib/framework-report", () => ({
  generateFrameworkReportPdf: vi.fn(),
}));

import { type AuthResult, authenticateRequest } from "@/lib/api-auth";
import { GET as frameworkReportHandler } from "@/app/api/vendors/[vendorId]/frameworks/[frameworkId]/report/route";
import { generateFrameworkReportPdf } from "@/lib/framework-report";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedGenerate = vi.mocked(generateFrameworkReportPdf);

function auth(permissions: string[]): AuthResult {
  return { userId: "user-1", roleId: "role-1", permissions, method: "session" };
}

function request(): Request {
  return new Request("http://localhost/api/vendors/v1/frameworks/f1/report");
}

function params(): {
  params: Promise<{ vendorId: string; frameworkId: string }>;
} {
  return { params: Promise.resolve({ vendorId: "v1", frameworkId: "f1" }) };
}

describe("GET /api/vendors/{vendorId}/frameworks/{frameworkId}/report", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const response = await frameworkReportHandler(request(), params());
    expect(response.status).toBe(401);
  });

  it("returns 403 without vendors:view", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.ASSESSMENTS_VIEW]));
    const response = await frameworkReportHandler(request(), params());
    expect(response.status).toBe(403);
  });

  it("returns a PDF when authorized", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.VENDORS_VIEW]));
    mockedGenerate.mockResolvedValueOnce(Buffer.from("pdf"));
    const response = await frameworkReportHandler(request(), params());
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
  });

  it("returns 404 when the vendor or framework is not found", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.VENDORS_VIEW]));
    mockedGenerate.mockRejectedValueOnce(
      new Error("Vendor or framework not found"),
    );
    const response = await frameworkReportHandler(request(), params());
    expect(response.status).toBe(404);
  });
});
