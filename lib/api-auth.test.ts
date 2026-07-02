import { describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/lib/permissions";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/api-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-auth")>();
  return { ...actual, authenticateRequest: vi.fn() };
});

import {
  type AuthResult,
  authResultHasPermission,
  authenticateRequest,
} from "@/lib/api-auth";
import { GET } from "@/app/api/v1/vendors/route";

const mockedAuthenticate = vi.mocked(authenticateRequest);

function buildAuth(permissions: string[]): AuthResult {
  return {
    userId: "user-1",
    roleId: "role-1",
    permissions,
    method: "session",
  };
}

describe("authResultHasPermission", () => {
  it("returns true when the permission is present", () => {
    const auth = buildAuth([PERMISSIONS.VENDORS_VIEW]);
    expect(authResultHasPermission(auth, PERMISSIONS.VENDORS_VIEW)).toBe(true);
  });

  it("returns false when the permission is missing", () => {
    const auth = buildAuth([PERMISSIONS.ASSESSMENTS_VIEW]);
    expect(authResultHasPermission(auth, PERMISSIONS.VENDORS_VIEW)).toBe(false);
  });
});

describe("v1/vendors GET permission enforcement", () => {
  it("returns 401 when the request is unauthenticated", async () => {
    mockedAuthenticate.mockResolvedValueOnce(null);
    const response = await GET(new Request("http://localhost/api/v1/vendors"));
    expect(response.status).toBe(401);
  });

  it("returns 403 when the role lacks vendors:view", async () => {
    mockedAuthenticate.mockResolvedValueOnce(buildAuth([]));
    const response = await GET(new Request("http://localhost/api/v1/vendors"));
    expect(response.status).toBe(403);
  });
});
