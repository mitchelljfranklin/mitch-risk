import { describe, expect, it } from "vitest";

import {
  buildBackParam,
  buildFilterQueryString,
  resolveBackHref,
  resolveTab,
} from "@/lib/nav";

describe("buildBackParam", () => {
  it("encodes a full return path with only the given keys", () => {
    const param = buildBackParam(
      "/vendors",
      { query: "aws", tier: "HIGH", sort: "name", page: "2", ignored: "x" },
      ["query", "tier", "sort", "page"],
    );
    expect(param).toBe(
      `?back=${encodeURIComponent("/vendors?query=aws&tier=HIGH&sort=name&page=2")}`,
    );
  });

  it("omits empty values and returns the bare path when no filters", () => {
    const param = buildBackParam("/assessments", { query: "" }, ["query"]);
    expect(param).toBe(`?back=${encodeURIComponent("/assessments")}`);
  });

  it("round-trips through a single decode", () => {
    const param = buildBackParam(
      "/risk-register",
      { status: "OPEN", vendorId: "v1" },
      ["status", "vendorId"],
    );
    const decoded = decodeURIComponent(param.slice("?back=".length));
    expect(decoded).toBe("/risk-register?status=OPEN&vendorId=v1");
  });
});

describe("resolveBackHref", () => {
  it("returns the back value when it matches the prefix", () => {
    expect(resolveBackHref("/vendors?query=aws", "/vendors", "/vendors")).toBe(
      "/vendors?query=aws",
    );
  });

  it("returns the exact prefix when back equals it", () => {
    expect(resolveBackHref("/vendors", "/vendors", "/vendors")).toBe(
      "/vendors",
    );
  });

  it("returns the fallback for a foreign source", () => {
    expect(
      resolveBackHref("/risk-register?status=OPEN", "/vendors", "/vendors"),
    ).toBe("/vendors");
    expect(
      resolveBackHref("/assessments?vendorId=v1", "/vendors", "/vendors"),
    ).toBe("/vendors");
  });

  it("does not accept a prefix that shares a boundary (e.g. /vendors-evil)", () => {
    expect(resolveBackHref("/vendors-evil", "/vendors", "/vendors")).toBe(
      "/vendors",
    );
  });

  it("returns the fallback for an undefined back", () => {
    expect(resolveBackHref(undefined, "/vendors", "/vendors")).toBe("/vendors");
  });
});

describe("resolveTab", () => {
  const allowed = ["overview", "compliance", "findings", "assessments"];

  it("returns a valid raw tab", () => {
    expect(resolveTab("compliance", allowed, "overview")).toBe("compliance");
  });

  it("falls back for an invalid tab", () => {
    expect(resolveTab("bogus", allowed, "overview")).toBe("overview");
  });

  it("falls back for a null tab", () => {
    expect(resolveTab(null, allowed, "overview")).toBe("overview");
  });
});

describe("buildFilterQueryString", () => {
  it("keeps only set values and joins them", () => {
    expect(
      buildFilterQueryString({
        action: "LOGIN",
        userId: undefined,
        fromDate: "",
        toDate: "2026-08-01",
      }),
    ).toBe("action=LOGIN&toDate=2026-08-01");
  });

  it("returns an empty string when nothing is set", () => {
    expect(buildFilterQueryString({ status: undefined, recipient: "" })).toBe(
      "",
    );
  });

  it("encodes values that need it", () => {
    expect(buildFilterQueryString({ recipient: "a@b.com" })).toBe(
      `recipient=${encodeURIComponent("a@b.com")}`,
    );
  });
});
