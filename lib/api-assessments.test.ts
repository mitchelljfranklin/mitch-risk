/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/lib/permissions";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/api-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-auth")>();
  return { ...actual, authenticateRequest: vi.fn() };
});

vi.mock("@/lib/db/assessments", () => ({
  listAssessments: vi.fn(),
  getAssessment: vi.fn(),
}));

vi.mock("@/lib/db/vendors", () => ({
  getVendor: vi.fn(),
}));

import { type AuthResult, authenticateRequest } from "@/lib/api-auth";
import { GET as listAssessmentsHandler } from "@/app/api/v1/assessments/route";
import { GET as getAssessmentHandler } from "@/app/api/v1/assessments/[assessmentId]/route";
import { GET as vendorAssessmentHandler } from "@/app/api/v1/vendors/[vendorId]/assessments/route";
import { listAssessments, getAssessment } from "@/lib/db/assessments";
import { getVendor } from "@/lib/db/vendors";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedList = vi.mocked(listAssessments);
const mockedGet = vi.mocked(getAssessment);
const mockedGetVendor = vi.mocked(getVendor);

function auth(permissions: string[]): AuthResult {
  return { userId: "user-1", roleId: "role-1", permissions, method: "session" };
}

describe("GET /v1/assessments", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const response = await listAssessmentsHandler(
      new Request("http://localhost/api/v1/assessments"),
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 without assessments:view", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.VENDORS_VIEW]));
    const response = await listAssessmentsHandler(
      new Request("http://localhost/api/v1/assessments"),
    );
    expect(response.status).toBe(403);
  });

  it("returns paginated assessment list", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.ASSESSMENTS_VIEW]));
    mockedList.mockResolvedValueOnce({
      assessments: [
        {
          id: "a1",
          title: "Test Assessment",
          vendorId: "v1",
          vendor: { name: "TestCo" },
          status: "COMPLETED",
          score: 0.85,
          dueDate: new Date(),
          sentAt: new Date(),
          submittedAt: new Date(),
          template: { name: "Standard", version: 1 },
          reviewer: { name: "Reviewer" },
        } as any,
      ],
      totalCount: 1,
      page: 1,
      pageSize: 25,
    });
    const response = await listAssessmentsHandler(
      new Request("http://localhost/api/v1/assessments"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalCount).toBe(1);
    expect(body.entries[0].title).toBe("Test Assessment");
  });

  it("returns CSV when format=csv", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.ASSESSMENTS_VIEW]));
    mockedList.mockResolvedValueOnce({
      assessments: [],
      totalCount: 0,
      page: 1,
      pageSize: 25,
    });
    const response = await listAssessmentsHandler(
      new Request("http://localhost/api/v1/assessments?format=csv"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
  });
});

describe("GET /v1/assessments/{assessmentId}", () => {
  it("returns 404 when not found", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.ASSESSMENTS_VIEW]));
    mockedGet.mockResolvedValueOnce(null);
    const response = await getAssessmentHandler(
      new Request("http://localhost/api/v1/assessments/a1"),
      { params: Promise.resolve({ assessmentId: "a1" }) },
    );
    expect(response.status).toBe(404);
  });
});

describe("GET /v1/vendors/{vendorId}/assessments", () => {
  it("returns 404 when vendor not found", async () => {
    mockedAuth.mockResolvedValueOnce(auth([PERMISSIONS.VENDORS_VIEW]));
    mockedGetVendor.mockResolvedValueOnce(null);
    const response = await vendorAssessmentHandler(
      new Request("http://localhost/api/v1/vendors/v1/assessments"),
      { params: Promise.resolve({ vendorId: "v1" }) },
    );
    expect(response.status).toBe(404);
  });
});
