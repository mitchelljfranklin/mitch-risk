import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createVendor,
  getVendorForExport,
  listVendors,
} from "@/lib/db/vendors";
import { prisma } from "@/lib/prisma";

const VENDOR_A = "P27 Vendor Alpha";
const VENDOR_B = "P27 Vendor Beta";

async function cleanup() {
  await prisma.vendor.deleteMany({
    where: { name: { in: [VENDOR_A, VENDOR_B] } },
  });
}

beforeAll(cleanup);

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("vendor search and export (integration)", () => {
  it("filters vendors by name query", async () => {
    await createVendor({
      name: VENDOR_A,
      contactName: "",
      contactEmail: "alpha@example.test",
      tier: "LOW",
      website: "",
      notes: "",
    });
    await createVendor({
      name: VENDOR_B,
      contactName: "",
      contactEmail: "beta@example.test",
      tier: "HIGH",
      website: "",
      notes: "",
    });

    const all = await listVendors();
    expect(all.totalCount).toBeGreaterThanOrEqual(2);

    const filtered = await listVendors({ query: "P27 Vendor Alpha" });
    expect(filtered.vendors.length).toBe(1);
    expect(filtered.vendors[0].name).toBe(VENDOR_A);

    const byTier = await listVendors({ tier: "HIGH" });
    const tierMatches = byTier.vendors.filter((v) => v.name === VENDOR_B);
    expect(tierMatches.length).toBe(1);
    expect(tierMatches[0].name).toBe(VENDOR_B);
  });

  it("filters vendors by email query", async () => {
    const results = await listVendors({ query: "beta@example" });
    expect(results.vendors.length).toBe(1);
    expect(results.vendors[0].contactEmail).toContain("beta@example");
  });

  it("returns empty when no vendor matches", async () => {
    const results = await listVendors({ query: "nonexistent-xyz" });
    expect(results.vendors.length).toBe(0);
    expect(results.totalCount).toBe(0);
  });

  it("sorts vendors by name descending", async () => {
    const desc = await listVendors({ query: "P27 Vendor", sort: "name-desc" });
    const names = desc.vendors.map((v) => v.name);
    expect(names.indexOf(VENDOR_B)).toBeLessThan(names.indexOf(VENDOR_A));
  });

  it("getVendorForExport returns vendor with assessment summaries", async () => {
    const { vendors } = await listVendors({ query: VENDOR_A });
    const vendor = await getVendorForExport(vendors[0].id);
    expect(vendor).not.toBeNull();
    if (!vendor) throw new Error("vendor not found");
    expect(vendor.name).toBe(VENDOR_A);
    expect(vendor.contactEmail).toContain("alpha@example");
    expect(Array.isArray(vendor.assessments)).toBe(true);
  });
});
