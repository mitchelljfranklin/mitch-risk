import { afterAll, describe, expect, it } from "vitest";

import { listControls, listFrameworks } from "@/lib/db/frameworks";
import { prisma } from "@/lib/prisma";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("frameworks library (integration)", () => {
  it("seeds all four frameworks with the expected control counts", async () => {
    const frameworks = await listFrameworks();
    const iso = frameworks.find((framework) => framework.name === "ISO 27001");
    const soc2 = frameworks.find((framework) => framework.name === "SOC 2");
    const nist = frameworks.find((framework) => framework.name === "NIST CSF");
    const e8 = frameworks.find(
      (framework) => framework.name === "Essential Eight",
    );

    expect(iso?._count.controls).toBe(93);
    expect(soc2?._count.controls).toBe(51);
    expect(nist?._count.controls).toBe(129);
    expect(e8?._count.controls).toBe(55);
  });

  it("filters controls by a case-insensitive search term", async () => {
    const frameworks = await listFrameworks();
    const iso = frameworks.find((framework) => framework.name === "ISO 27001");
    if (!iso) {
      throw new Error("ISO 27001 is not seeded");
    }

    const results = await listControls(iso.id, "cryptography");

    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every((control) =>
        /cryptograph/i.test(`${control.title} ${control.guidance}`),
      ),
    ).toBe(true);
  });
});
