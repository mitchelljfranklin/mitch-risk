import { afterAll, describe, expect, it } from "vitest";

import { storage } from "@/lib/storage";

const testKey = "test/vitest-storage-roundtrip.txt";

afterAll(async () => {
  await storage.delete(testKey).catch(() => undefined);
});

describe("disk storage", () => {
  it("saves, reads, and deletes a file", async () => {
    await storage.save(testKey, Buffer.from("evidence round trip", "utf8"));

    const read = await storage.read(testKey);
    expect(read.toString("utf8")).toBe("evidence round trip");

    await storage.delete(testKey);
    await expect(storage.read(testKey)).rejects.toThrow();
  });

  it("rejects path-traversal keys", async () => {
    await expect(
      storage.save("../escape.txt", Buffer.from("x", "utf8")),
    ).rejects.toThrow();
  });
});
