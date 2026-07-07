/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/lib/permissions";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/api-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-auth")>();
  return { ...actual, authenticateRequest: vi.fn() };
});

vi.mock("@/lib/db/findings", () => ({
  listFindings: vi.fn(),
  getFinding: vi.fn(),
  updateFindingStatus: vi.fn(),
}));

import { type AuthResult, authenticateRequest } from "@/lib/api-auth";
import { GET } from "@/app/api/v1/findings/route";
import { PATCH } from "@/app/api/v1/findings/[findingId]/route";
import {
  listFindings,
  getFinding,
  updateFindingStatus,
} from "@/lib/db/findings";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedList = vi.mocked(listFindings);
const mockedGet = vi.mocked(getFinding);
const mockedUpdate = vi.mocked(updateFindingStatus);

function auth(permissions: string[]): AuthResult {
  return { userId: "user-1", roleId: "role-1", permissions, method: "session" };
}

describe("GET /v1/findings", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const response = await GET(new Request("http://localhost/api/v1/findings"));
    expect(response.status).toBe(401);
  });

  it("returns 403 without assessments:view", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.VENDORS_VIEW]));
    const response = await GET(new Request("http://localhost/api/v1/findings"));
    expect(response.status).toBe(403);
  });

  it("returns paginated findings list", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.ASSESSMENTS_VIEW]));
    mockedList.mockResolvedValueOnce({
      findings: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
    });
    const response = await GET(new Request("http://localhost/api/v1/findings"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalCount).toBe(0);
  });
});

describe("PATCH /v1/findings/{findingId}", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const response = await PATCH(
      new Request("http://localhost/api/v1/findings/f1", {
        method: "PATCH",
        body: JSON.stringify({ status: "REMEDIATED" }),
      }),
      { params: Promise.resolve({ findingId: "f1" }) },
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 without assessments:review", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.ASSESSMENTS_VIEW]));
    const response = await PATCH(
      new Request("http://localhost/api/v1/findings/f1", {
        method: "PATCH",
        body: JSON.stringify({ status: "REMEDIATED" }),
      }),
      { params: Promise.resolve({ findingId: "f1" }) },
    );
    expect(response.status).toBe(403);
  });

  it("returns 404 when finding not found", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.ASSESSMENTS_REVIEW]));
    mockedGet.mockResolvedValueOnce(null);
    const response = await PATCH(
      new Request("http://localhost/api/v1/findings/f1", {
        method: "PATCH",
        body: JSON.stringify({ status: "REMEDIATED" }),
      }),
      { params: Promise.resolve({ findingId: "f1" }) },
    );
    expect(response.status).toBe(404);
  });

  it("returns 400 when finding already closed", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.ASSESSMENTS_REVIEW]));
    mockedGet.mockResolvedValueOnce({
      id: "f1",
      status: "REMEDIATED",
    } as any);
    const response = await PATCH(
      new Request("http://localhost/api/v1/findings/f1", {
        method: "PATCH",
        body: JSON.stringify({ status: "REMEDIATED" }),
      }),
      { params: Promise.resolve({ findingId: "f1" }) },
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 on invalid status", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.ASSESSMENTS_REVIEW]));
    mockedGet.mockResolvedValueOnce({
      id: "f1",
      status: "OPEN",
    } as any);
    const response = await PATCH(
      new Request("http://localhost/api/v1/findings/f1", {
        method: "PATCH",
        body: JSON.stringify({ status: "INVALID" }),
      }),
      { params: Promise.resolve({ findingId: "f1" }) },
    );
    expect(response.status).toBe(400);
  });

  it("updates successfully and returns updated finding", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.ASSESSMENTS_REVIEW]));
    mockedGet.mockResolvedValueOnce({
      id: "f1",
      status: "OPEN",
    } as any);
    mockedUpdate.mockResolvedValueOnce({
      id: "f1",
      title: "Test Finding",
      status: "REMEDIATED",
      severity: "HIGH",
      resolutionNote: "Fixed",
      resolvedAt: new Date(),
    } as any);
    const response = await PATCH(
      new Request("http://localhost/api/v1/findings/f1", {
        method: "PATCH",
        body: JSON.stringify({
          status: "REMEDIATED",
          resolutionNote: "Fixed",
        }),
      }),
      { params: Promise.resolve({ findingId: "f1" }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("REMEDIATED");
    expect(body.resolutionNote).toBe("Fixed");
  });
});
