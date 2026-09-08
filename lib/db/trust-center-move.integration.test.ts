import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requirePermission: vi.fn().mockResolvedValue(undefined),
  getCurrentUser: vi.fn().mockResolvedValue(null),
}));

import { prisma } from "@/lib/prisma";
import {
  deleteTrustBadge,
  deleteTrustDocument,
  deleteTrustSection,
  deleteTrustSubprocessor,
  moveTrustBadge,
  moveTrustDocument,
  moveTrustSection,
  moveTrustSubprocessor,
} from "@/lib/db/trust-center";

const PREFIX = "TC-MOVE";

async function cleanup(): Promise<void> {
  await prisma.trustCenterBadge.deleteMany({
    where: { title: { startsWith: PREFIX } },
  });
  await prisma.trustCenterDocument.deleteMany({
    where: { title: { startsWith: PREFIX } },
  });
  await prisma.trustCenterSection.deleteMany({
    where: { title: { startsWith: PREFIX } },
  });
  await prisma.trustCenterSubprocessor.deleteMany({
    where: { name: { startsWith: PREFIX } },
  });
}

// Generic ordered-title reader across the four delegates.
async function orderedTitles(
  delegate: unknown,
  nameField: "title" | "name",
): Promise<string[]> {
  const rows = await (
    delegate as {
      findMany: (args: unknown) => Promise<Record<string, string>[]>;
    }
  ).findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((row) => row[nameField]);
}

function delegateFor(
  model: "badge" | "document" | "section" | "subprocessor",
): unknown {
  switch (model) {
    case "badge":
      return prisma.trustCenterBadge;
    case "document":
      return prisma.trustCenterDocument;
    case "section":
      return prisma.trustCenterSection;
    case "subprocessor":
      return prisma.trustCenterSubprocessor;
  }
}

async function firstIdOf(
  model: "badge" | "document" | "section" | "subprocessor",
  text: string,
): Promise<string> {
  // Subprocessors are identified by `name`; the other three use `title`.
  const textField = model === "subprocessor" ? "name" : "title";
  const delegate = delegateFor(model) as {
    findFirstOrThrow: (args: unknown) => Promise<{ id: string }>;
  };
  const row = await delegate.findFirstOrThrow({
    where: { [textField]: text },
  });
  return row.id;
}

beforeAll(async () => {
  await cleanup();

  // Seed three items per model with all-equal sortOrder (0): exercises the
  // tie-normalisation path on the first move, which is what legacy data
  // looks like before any reordering.
  for (let index = 0; index < 3; index++) {
    await prisma.trustCenterBadge.create({
      data: { title: `${PREFIX} Badge ${index}`, sortOrder: 0 },
    });
    await prisma.trustCenterDocument.create({
      data: { title: `${PREFIX} Document ${index}`, sortOrder: 0 },
    });
    await prisma.trustCenterSection.create({
      data: { title: `${PREFIX} Section ${index}`, sortOrder: 0 },
    });
    await prisma.trustCenterSubprocessor.create({
      data: { name: `${PREFIX} Subprocessor ${index}`, sortOrder: 0 },
    });
  }
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("trust center reorder (integration)", () => {
  it("badge: normalises ties on first move, then swaps deterministically", async () => {
    const firstId = await firstIdOf("badge", `${PREFIX} Badge 1`);
    await moveTrustBadge(firstId, "up");

    // After tie-normalisation the order was [0,1,2]; moving "Badge 1" up
    // swaps it with "Badge 0".
    expect(await orderedTitles(delegateFor("badge"), "title")).toEqual([
      `${PREFIX} Badge 1`,
      `${PREFIX} Badge 0`,
      `${PREFIX} Badge 2`,
    ]);

    await moveTrustBadge(firstId, "down");
    expect(await orderedTitles(delegateFor("badge"), "title")).toEqual([
      `${PREFIX} Badge 0`,
      `${PREFIX} Badge 1`,
      `${PREFIX} Badge 2`,
    ]);
  });

  it("badge: moving the first item up is a no-op", async () => {
    const firstId = await firstIdOf("badge", `${PREFIX} Badge 0`);
    const before = await orderedTitles(delegateFor("badge"), "title");

    await moveTrustBadge(firstId, "up");

    expect(await orderedTitles(delegateFor("badge"), "title")).toEqual(before);
  });

  it("document: moves down swap with the next neighbour", async () => {
    const firstId = await firstIdOf("document", `${PREFIX} Document 0`);
    await moveTrustDocument(firstId, "down");

    expect(await orderedTitles(delegateFor("document"), "title")).toEqual([
      `${PREFIX} Document 1`,
      `${PREFIX} Document 0`,
      `${PREFIX} Document 2`,
    ]);
  });

  it("subprocessor: moving the last item down is a no-op", async () => {
    const lastName = `${PREFIX} Subprocessor 2`;
    const lastId = await firstIdOf("subprocessor", lastName);

    await moveTrustSubprocessor(lastId, "down");

    const names = (
      await prisma.trustCenterSubprocessor.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      })
    ).map((row) => row.name);
    expect(names).toEqual([
      `${PREFIX} Subprocessor 0`,
      `${PREFIX} Subprocessor 1`,
      `${PREFIX} Subprocessor 2`,
    ]);
  });

  it("section: swaps persist distinct sortOrder values", async () => {
    const firstId = await firstIdOf("section", `${PREFIX} Section 1`);
    await moveTrustSection(firstId, "up");

    const rows = await prisma.trustCenterSection.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    expect(rows.map((row) => row.title)).toEqual([
      `${PREFIX} Section 1`,
      `${PREFIX} Section 0`,
      `${PREFIX} Section 2`,
    ]);
    const sortOrders = rows.map((row) => row.sortOrder);
    expect(new Set(sortOrders).size).toBe(sortOrders.length);
  });

  it("deleting a middle item leaves no gaps: moves still behave", async () => {
    await prisma.trustCenterSection.deleteMany({
      where: { title: `${PREFIX} Section 1` },
    });

    const remaining = await prisma.trustCenterSection.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    // After a delete the sortOrders may be non-sequential (0 and 2); a move
    // must still swap against the ordered neighbour, not the numeric one.
    await moveTrustSection(remaining[0]!.id, "down");

    const after = await prisma.trustCenterSection.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    expect(after.map((row) => row.title)).toEqual([
      `${PREFIX} Section 2`,
      `${PREFIX} Section 0`,
    ]);
  });
});
