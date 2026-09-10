import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requirePermission: vi.fn().mockResolvedValue(undefined),
  getCurrentUser: vi.fn().mockResolvedValue(null),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { saveTrustSubprocessorAction } from "@/lib/actions/trust-center";

const minimalPng = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 7, 7, 7,
]);

const PREFIX = "TC-SUB-LOGO";

async function cleanup(): Promise<void> {
  const subprocessors = await prisma.trustCenterSubprocessor.findMany({
    where: { name: { startsWith: PREFIX } },
  });
  for (const subprocessor of subprocessors) {
    if (subprocessor.logoKey) {
      await storage.delete(subprocessor.logoKey).catch(() => {
        // file already gone
      });
    }
  }
  await prisma.trustCenterSubprocessor.deleteMany({
    where: { name: { startsWith: PREFIX } },
  });
}

function formDataWith(
  fields: Record<string, string | boolean | File>,
): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "boolean") {
      if (value) formData.set(key, "on");
    } else {
      formData.set(key, value);
    }
  }
  return formData;
}

function testFile(name: string, buffer: Buffer): File {
  return new File([new Uint8Array(buffer)], name, { type: "image/png" });
}

beforeAll(async () => {
  await cleanup();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL | RequestInfo) => {
      const target = String(url);
      if (target.includes("notimage")) {
        return new Response("just text", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      }
      return new Response(new Uint8Array(minimalPng), {
        status: 200,
        headers: { "Content-Type": "image/png" },
      });
    }) as never,
  );
});

afterAll(async () => {
  await cleanup();
  vi.unstubAllGlobals();
  await prisma.$disconnect();
});

describe("subprocessor logo (integration)", () => {
  it("stores an uploaded logo", async () => {
    const created = await saveTrustSubprocessorAction(
      undefined,
      formDataWith({
        name: `${PREFIX} Upload`,
        published: true,
        logoFile: testFile("logo.png", minimalPng),
      }),
    );
    expect(created?.ok).toBe(true);

    const subprocessor = await prisma.trustCenterSubprocessor.findFirstOrThrow({
      where: { name: `${PREFIX} Upload` },
    });
    expect(subprocessor.logoKey).toMatch(/^trust-subprocessor-/);
    await expect(storage.read(subprocessor.logoKey)).resolves.toBeTruthy();
  });

  it("fetches and stores a pasted image URL", async () => {
    const created = await saveTrustSubprocessorAction(
      undefined,
      formDataWith({
        name: `${PREFIX} URL`,
        published: true,
        logoUrl: "https://cdn.example.test/logo.png",
      }),
    );
    expect(created?.ok).toBe(true);

    const subprocessor = await prisma.trustCenterSubprocessor.findFirstOrThrow({
      where: { name: `${PREFIX} URL` },
    });
    expect(subprocessor.logoKey).toMatch(/^trust-subprocessor-/);
    await expect(storage.read(subprocessor.logoKey)).resolves.toBeTruthy();
  });

  it("rejects internal-network image URLs without fetching", async () => {
    const created = await saveTrustSubprocessorAction(
      undefined,
      formDataWith({
        name: `${PREFIX} Internal`,
        published: true,
        logoUrl: "https://192.168.1.5/logo.png",
      }),
    );
    expect(created?.ok).toBe(false);

    const stored = await prisma.trustCenterSubprocessor.findFirst({
      where: { name: `${PREFIX} Internal` },
    });
    expect(stored).toBeNull();
  });

  it("rejects URLs returning non-raster content", async () => {
    const created = await saveTrustSubprocessorAction(
      undefined,
      formDataWith({
        name: `${PREFIX} NotImage`,
        published: true,
        logoUrl: "https://cdn.example.test/notimage",
      }),
    );
    expect(created?.ok).toBe(false);

    const stored = await prisma.trustCenterSubprocessor.findFirst({
      where: { name: `${PREFIX} NotImage` },
    });
    expect(stored).toBeNull();
  });
});
