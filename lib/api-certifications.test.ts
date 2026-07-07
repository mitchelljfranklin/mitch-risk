/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/lib/permissions";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/api-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-auth")>();
  return { ...actual, authenticateRequest: vi.fn() };
});

vi.mock("@/lib/db/vendors", () => ({
  getVendor: vi.fn(),
}));

vi.mock("@/lib/db/certifications", () => ({
  listVendorCertifications: vi.fn(),
  listAttachments: vi.fn(),
}));

import { type AuthResult, authenticateRequest } from "@/lib/api-auth";
import { GET } from "@/app/api/v1/vendors/[vendorId]/certifications/route";
import { getVendor } from "@/lib/db/vendors";
import {
  listVendorCertifications,
  listAttachments,
} from "@/lib/db/certifications";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedGetVendor = vi.mocked(getVendor);
const mockedCerts = vi.mocked(listVendorCertifications);
const mockedAttachments = vi.mocked(listAttachments);

function auth(permissions: string[]): AuthResult {
  return { userId: "user-1", roleId: "role-1", permissions, method: "session" };
}

describe("GET /v1/vendors/{vendorId}/certifications", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const response = await GET(
      new Request("http://localhost/api/v1/vendors/v1/certifications"),
      { params: Promise.resolve({ vendorId: "v1" }) },
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 without vendors:view", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.ASSESSMENTS_VIEW]));
    const response = await GET(
      new Request("http://localhost/api/v1/vendors/v1/certifications"),
      { params: Promise.resolve({ vendorId: "v1" }) },
    );
    expect(response.status).toBe(403);
  });

  it("returns 404 when vendor not found", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.VENDORS_VIEW]));
    mockedGetVendor.mockResolvedValueOnce(null);
    const response = await GET(
      new Request("http://localhost/api/v1/vendors/v1/certifications"),
      { params: Promise.resolve({ vendorId: "v1" }) },
    );
    expect(response.status).toBe(404);
  });

  it("returns certifications with attachment counts", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.VENDORS_VIEW]));
    mockedGetVendor.mockResolvedValueOnce({
      id: "v1",
      name: "TestCo",
    } as any);
    mockedCerts.mockResolvedValueOnce([
      {
        id: "c1",
        name: "ISO 27001 Cert",
        issuer: "BSI",
        issuedDate: new Date("2025-01-01"),
        expiresDate: new Date("2028-01-01"),
        notes: null,
      } as any,
    ]);
    mockedAttachments.mockResolvedValueOnce([
      {
        id: "att1",
        fileName: "cert.pdf",
        displayName: "Certificate",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      } as any,
    ]);
    const response = await GET(
      new Request("http://localhost/api/v1/vendors/v1/certifications"),
      { params: Promise.resolve({ vendorId: "v1" }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.vendorName).toBe("TestCo");
    expect(body.entries.length).toBe(1);
    expect(body.entries[0].attachmentCount).toBe(1);
  });
});
