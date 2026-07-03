import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createCertification } from "@/lib/db/certifications";
import { listUpcomingKeyDates } from "@/lib/db/dashboard";
import { createVendor } from "@/lib/db/vendors";
import { prisma } from "@/lib/prisma";

const VENDOR = "P71 Upcoming Vendor";

async function cleanup() {
  await prisma.vendor.deleteMany({ where: { name: VENDOR } });
}

beforeAll(cleanup);

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

function isoInDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

describe("listUpcomingKeyDates (integration)", () => {
  it("includes certifications and contract renewals within the window, sorted", async () => {
    const vendor = await createVendor({
      name: VENDOR,
      contactName: "",
      contactEmail: "p71@example.test",
      tier: "HIGH",
      website: "",
      notes: "",
      contractRenewalDate: isoInDays(20),
    });
    await createCertification(vendor.id, {
      name: "SOC 2",
      expiresDate: isoInDays(10),
    });
    // Outside the 60-day window — must be excluded.
    await createCertification(vendor.id, {
      name: "Far away cert",
      expiresDate: isoInDays(200),
    });

    const upcoming = await listUpcomingKeyDates(60);
    const mine = upcoming.filter((item) => item.vendorId === vendor.id);
    const labels = mine.map((item) => item.label);

    expect(labels).toContain("SOC 2");
    expect(labels).toContain("Contract renewal");
    expect(labels).not.toContain("Far away cert");

    // Sorted ascending: the SOC 2 cert (10d) comes before the contract (20d).
    const socIndex = mine.findIndex((item) => item.label === "SOC 2");
    const contractIndex = mine.findIndex(
      (item) => item.label === "Contract renewal",
    );
    expect(socIndex).toBeLessThan(contractIndex);
  });
});
