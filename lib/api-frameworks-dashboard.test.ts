/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/lib/permissions";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/api-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-auth")>();
  return { ...actual, authenticateRequest: vi.fn() };
});

vi.mock("@/lib/db/frameworks", () => ({
  listFrameworks: vi.fn(),
  getFramework: vi.fn(),
  listControls: vi.fn(),
}));

vi.mock("@/lib/db/compliance", () => ({
  getDashboardData: vi.fn(),
}));

import { type AuthResult, authenticateRequest } from "@/lib/api-auth";
import { GET as frameworksListHandler } from "@/app/api/v1/frameworks/route";
import { GET as frameworkDetailHandler } from "@/app/api/v1/frameworks/[frameworkId]/route";
import { GET as dashboardHandler } from "@/app/api/v1/dashboard/route";
import {
  listFrameworks,
  getFramework,
  listControls,
} from "@/lib/db/frameworks";
import { getDashboardData } from "@/lib/db/compliance";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedList = vi.mocked(listFrameworks);
const mockedGet = vi.mocked(getFramework);
const mockedControls = vi.mocked(listControls);
const mockedDashboard = vi.mocked(getDashboardData);

function auth(permissions: string[]): AuthResult {
  return { userId: "user-1", roleId: "role-1", permissions, method: "session" };
}

describe("GET /v1/frameworks", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const response = await frameworksListHandler(
      new Request("http://localhost/api/v1/frameworks"),
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 without frameworks:view", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.VENDORS_VIEW]));
    const response = await frameworksListHandler(
      new Request("http://localhost/api/v1/frameworks"),
    );
    expect(response.status).toBe(403);
  });

  it("returns framework list", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.FRAMEWORKS_VIEW]));
    mockedList.mockResolvedValueOnce([
      {
        id: "f1",
        name: "ISO 27001",
        version: "2022",
        description: "Standard",
        _count: { controls: 93 },
      } as any,
    ]);
    const response = await frameworksListHandler(
      new Request("http://localhost/api/v1/frameworks"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body[0].name).toBe("ISO 27001");
    expect(body[0].controlCount).toBe(93);
  });
});

describe("GET /v1/frameworks/{frameworkId}", () => {
  it("returns 404 when not found", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.FRAMEWORKS_VIEW]));
    mockedGet.mockResolvedValueOnce(null);
    const response = await frameworkDetailHandler(
      new Request("http://localhost/api/v1/frameworks/f1"),
      { params: Promise.resolve({ frameworkId: "f1" }) },
    );
    expect(response.status).toBe(404);
  });

  it("returns framework with controls", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.FRAMEWORKS_VIEW]));
    mockedGet.mockResolvedValueOnce({
      id: "f1",
      name: "ISO 27001",
      version: "2022",
      description: "Standard",
    } as any);
    mockedControls.mockResolvedValueOnce([
      {
        id: "c1",
        domain: "A",
        code: "A.5.1",
        title: "Policies",
        guidance: "Maintain...",
        order: 1,
      } as any,
    ]);
    const response = await frameworkDetailHandler(
      new Request("http://localhost/api/v1/frameworks/f1"),
      { params: Promise.resolve({ frameworkId: "f1" }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.controls.length).toBe(1);
    expect(body.controls[0].code).toBe("A.5.1");
  });
});

describe("GET /v1/dashboard/summary", () => {
  it("returns 403 without assessments:view", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.VENDORS_VIEW]));
    const response = await dashboardHandler(
      new Request("http://localhost/api/v1/dashboard/summary"),
    );
    expect(response.status).toBe(403);
  });

  it("returns dashboard data", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.ASSESSMENTS_VIEW]));
    mockedDashboard.mockResolvedValueOnce({
      vendors: [],
      vendorCount: 0,
      averageScore: null,
      openFindings: 0,
      needsAttention: 0,
      scoreDistribution: { green: 0, amber: 0, red: 0, unscored: 0 },
      topDeficientControls: [],
      riskByTier: [],
      assessmentStatusCounts: {},
      vendorsByTier: {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
        Unspecified: 0,
      },
    } as any);
    const response = await dashboardHandler(
      new Request("http://localhost/api/v1/dashboard/summary"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.vendorCount).toBe(0);
    expect(body.scoreDistribution).toBeDefined();
  });
});
