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
  updateVendor: vi.fn(),
  deleteVendor: vi.fn(),
}));

import { type AuthResult, authenticateRequest } from "@/lib/api-auth";
import { PUT, DELETE } from "@/app/api/v1/vendors/[vendorId]/route";
import { getVendor, updateVendor, deleteVendor } from "@/lib/db/vendors";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedGetVendor = vi.mocked(getVendor);
const mockedUpdateVendor = vi.mocked(updateVendor);
const mockedDeleteVendor = vi.mocked(deleteVendor);

function auth(permissions: string[]): AuthResult {
  return { userId: "user-1", roleId: "role-1", permissions, method: "session" };
}

const mockVendor = {
  id: "v1",
  name: "TestCo",
  externalId: null as string | null,
  contactName: "Jane",
  contactEmail: "jane@testco.example",
  tier: "MEDIUM",
  website: "",
  notes: "",
  serviceDescription: "",
  dataSensitivity: "",
  contractRenewalDate: "",
  ownerId: "",
  overallScore: null as number | null,
  lastAssessedAt: null as Date | null,
  owner: { id: "u1", name: "Owner" } as any,
  assessments: [] as any[],
};

describe("PUT /v1/vendors/{vendorId}", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const response = await PUT(
      new Request("http://localhost/api/v1/vendors/v1", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: Promise.resolve({ vendorId: "v1" }) },
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 without vendors:edit", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.VENDORS_VIEW]));
    const response = await PUT(
      new Request("http://localhost/api/v1/vendors/v1", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: Promise.resolve({ vendorId: "v1" }) },
    );
    expect(response.status).toBe(403);
  });

  it("returns 404 when vendor not found", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.VENDORS_EDIT]));
    mockedGetVendor.mockResolvedValueOnce(null);
    const response = await PUT(
      new Request("http://localhost/api/v1/vendors/v1", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: Promise.resolve({ vendorId: "v1" }) },
    );
    expect(response.status).toBe(404);
  });

  it("returns 400 on invalid JSON body", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.VENDORS_EDIT]));
    mockedGetVendor.mockResolvedValueOnce(mockVendor as any);
    const response = await PUT(
      new Request("http://localhost/api/v1/vendors/v1", {
        method: "PUT",
        body: "not json",
      }),
      { params: Promise.resolve({ vendorId: "v1" }) },
    );
    expect(response.status).toBe(400);
  });

  it("updates successfully and returns updated vendor", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.VENDORS_EDIT]));
    mockedGetVendor.mockResolvedValueOnce(mockVendor as any);
    mockedUpdateVendor.mockResolvedValueOnce({
      ...mockVendor,
      name: "UpdatedCo",
    } as any);
    const response = await PUT(
      new Request("http://localhost/api/v1/vendors/v1", {
        method: "PUT",
        body: JSON.stringify({ name: "UpdatedCo" }),
      }),
      { params: Promise.resolve({ vendorId: "v1" }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.name).toBe("UpdatedCo");
  });

  it("passes the externalId through on update", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.VENDORS_EDIT]));
    mockedGetVendor.mockResolvedValueOnce(mockVendor as any);
    mockedUpdateVendor.mockResolvedValueOnce({
      ...mockVendor,
      externalId: "ERP-V-001",
    } as any);
    const response = await PUT(
      new Request("http://localhost/api/v1/vendors/v1", {
        method: "PUT",
        body: JSON.stringify({ externalId: "ERP-V-001" }),
      }),
      { params: Promise.resolve({ vendorId: "v1" }) },
    );
    expect(response.status).toBe(200);
    expect(mockedUpdateVendor).toHaveBeenCalledWith(
      "v1",
      expect.objectContaining({ externalId: "ERP-V-001" }),
    );
  });
});

describe("DELETE /v1/vendors/{vendorId}", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const response = await DELETE(
      new Request("http://localhost/api/v1/vendors/v1", { method: "DELETE" }),
      { params: Promise.resolve({ vendorId: "v1" }) },
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 without vendors:delete", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.VENDORS_VIEW]));
    const response = await DELETE(
      new Request("http://localhost/api/v1/vendors/v1", { method: "DELETE" }),
      { params: Promise.resolve({ vendorId: "v1" }) },
    );
    expect(response.status).toBe(403);
  });

  it("returns 404 when vendor not found", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.VENDORS_DELETE]));
    mockedGetVendor.mockResolvedValueOnce(null);
    const response = await DELETE(
      new Request("http://localhost/api/v1/vendors/v1", { method: "DELETE" }),
      { params: Promise.resolve({ vendorId: "v1" }) },
    );
    expect(response.status).toBe(404);
  });

  it("deletes successfully and returns deleted:true", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.VENDORS_DELETE]));
    mockedGetVendor.mockResolvedValueOnce(mockVendor as any);
    mockedDeleteVendor.mockResolvedValueOnce(undefined);
    const response = await DELETE(
      new Request("http://localhost/api/v1/vendors/v1", { method: "DELETE" }),
      { params: Promise.resolve({ vendorId: "v1" }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.deleted).toBe(true);
  });
});
