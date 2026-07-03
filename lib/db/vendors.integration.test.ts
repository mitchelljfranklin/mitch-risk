import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createVendor,
  getVendor,
  getVendorForExport,
  listVendors,
  updateVendor,
} from "@/lib/db/vendors";
import { ensureSystemRoles, getRoleByName } from "@/lib/db/roles";
import { createUser } from "@/lib/db/users";
import { SYSTEM_ROLE_NAMES } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const VENDOR_A = "P27 Vendor Alpha";
const VENDOR_B = "P27 Vendor Beta";
const VENDOR_C = "P67 Vendor Gamma";
const OWNER_EMAIL = "p67-owner@example.test";

async function cleanup() {
  await prisma.vendor.deleteMany({
    where: { name: { in: [VENDOR_A, VENDOR_B, VENDOR_C] } },
  });
  await prisma.user.deleteMany({ where: { email: OWNER_EMAIL } });
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

describe("vendor profile enrichment (integration)", () => {
  it("persists owner, sensitivity, service, and renewal date", async () => {
    await ensureSystemRoles();
    const reviewerRole = await getRoleByName(SYSTEM_ROLE_NAMES.REVIEWER);
    if (!reviewerRole) throw new Error("reviewer role missing");
    const owner = await createUser({
      name: "P67 Owner",
      email: OWNER_EMAIL,
      password: "correct-horse-battery-staple",
      roleId: reviewerRole.id,
    });

    const created = await createVendor({
      name: VENDOR_C,
      contactName: "",
      contactEmail: "gamma@example.test",
      tier: "HIGH",
      website: "",
      notes: "",
      serviceDescription: "Cloud email hosting",
      dataSensitivity: "CONFIDENTIAL",
      contractRenewalDate: "2027-01-15",
      ownerId: owner.id,
    });

    const vendor = await getVendor(created.id);
    if (!vendor) throw new Error("vendor not found");
    expect(vendor.serviceDescription).toBe("Cloud email hosting");
    expect(vendor.dataSensitivity).toBe("CONFIDENTIAL");
    expect(vendor.ownerId).toBe(owner.id);
    expect(vendor.owner?.name).toBe("P67 Owner");
    expect(vendor.contractRenewalDate?.toISOString().slice(0, 10)).toBe(
      "2027-01-15",
    );
  });

  it("clears optional fields when saved empty", async () => {
    const { vendors } = await listVendors({ query: VENDOR_C });
    await updateVendor(vendors[0].id, {
      name: VENDOR_C,
      contactName: "",
      contactEmail: "gamma@example.test",
      tier: "HIGH",
      website: "",
      notes: "",
      serviceDescription: "",
      dataSensitivity: "",
      contractRenewalDate: "",
      ownerId: "",
    });
    const vendor = await getVendor(vendors[0].id);
    if (!vendor) throw new Error("vendor not found");
    expect(vendor.dataSensitivity).toBeNull();
    expect(vendor.contractRenewalDate).toBeNull();
    expect(vendor.ownerId).toBeNull();
  });

  it("keeps the vendor but nulls owner when the owner is deleted", async () => {
    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: OWNER_EMAIL },
    });
    // Re-assign owner then delete the user to exercise SetNull.
    const { vendors } = await listVendors({ query: VENDOR_C });
    await updateVendor(vendors[0].id, {
      name: VENDOR_C,
      contactName: "",
      contactEmail: "gamma@example.test",
      tier: "HIGH",
      website: "",
      notes: "",
      ownerId: owner.id,
    });
    await prisma.user.delete({ where: { id: owner.id } });

    const vendor = await getVendor(vendors[0].id);
    expect(vendor).not.toBeNull();
    expect(vendor?.ownerId).toBeNull();
  });
});
