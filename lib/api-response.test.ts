import { describe, expect, it, vi } from "vitest";

import { apiError, runApiHandler } from "@/lib/api-response";

describe("apiError", () => {
  it("returns a JSON error body with the given status", async () => {
    const response = apiError("Forbidden", 403);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });
});

describe("runApiHandler", () => {
  it("passes through the handler's response", async () => {
    const response = await runApiHandler(async () =>
      Response.json({ ok: true }, { status: 200 }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("returns a generic 500 and hides internals when the handler throws", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const response = await runApiHandler(async () => {
      throw new Error("secret database connection string leaked");
    });
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Internal error" });
    consoleSpy.mockRestore();
  });
});
