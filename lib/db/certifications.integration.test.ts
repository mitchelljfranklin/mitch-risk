import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createCertification,
  deleteCertification,
  listCertificationsExpiringOn,
  listVendorCertifications,
  updateCertification,
} from "@/lib/db/certifications";
import { createVendor } from "@/lib/db/vendors";
import { ensureSystemRoles, getRoleByName } from "@/lib/db/roles";
import { createUser } from "@/lib/db/users";
import { SYSTEM_ROLE_NAMES } from "@/lib/permissions";
import { certificationStatus } from "@/lib/schemas/certification";
import { prisma } from "@/lib/prisma";

const VENDOR = "P68 Cert Vendor";
const OWNER_EMAIL = "p68-owner@example.test";

async function cleanup() {
  await prisma.vendor.deleteMany({ where: { name: VENDOR } });
  await prisma.user.deleteMany({ where: { email: OWNER_EMAIL } });
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

describe("vendor certifications (integration)", () => {
  it("creates, updates, and deletes a certification", async () => {
    const vendor = await createVendor({
      name: VENDOR,
      contactName: "",
      contactEmail: "p68@example.test",
      tier: "",
      website: "",
      notes: "",
    });

    const cert = await createCertification(vendor.id, {
      name: "SOC 2 Type II",
      issuer: "Auditor LLP",
      issuedDate: isoInDays(-300),
      expiresDate: isoInDays(60),
      notes: "",
    });
    expect(cert.name).toBe("SOC 2 Type II");
    expect(cert.expiresDate).toBeInstanceOf(Date);

    let list = await listVendorCertifications(vendor.id);
    expect(list).toHaveLength(1);

    await updateCertification(cert.id, {
      name: "ISO 27001",
      expiresDate: isoInDays(10),
    });
    list = await listVendorCertifications(vendor.id);
    expect(list[0].name).toBe("ISO 27001");

    await deleteCertification(cert.id);
    list = await listVendorCertifications(vendor.id);
    expect(list).toHaveLength(0);
  });

  it("computes status from the expiry date", () => {
    expect(certificationStatus(isoInDays(-1))).toBe("expired");
    expect(certificationStatus(isoInDays(10))).toBe("expiring");
    expect(certificationStatus(isoInDays(120))).toBe("valid");
  });

  it("lists certifications expiring in a window with the owner email", async () => {
    await ensureSystemRoles();
    const reviewerRole = await getRoleByName(SYSTEM_ROLE_NAMES.REVIEWER);
    if (!reviewerRole) throw new Error("reviewer role missing");
    const owner = await createUser({
      name: "P68 Owner",
      email: OWNER_EMAIL,
      password: "correct-horse-battery-staple",
      roleId: reviewerRole.id,
    });

    const vendor = await prisma.vendor.findFirstOrThrow({
      where: { name: VENDOR },
    });
    await prisma.vendor.update({
      where: { id: vendor.id },
      data: { ownerId: owner.id },
    });

    const target = new Date();
    target.setDate(target.getDate() + 30);
    await createCertification(vendor.id, {
      name: "Expiring cert",
      expiresDate: target.toISOString().slice(0, 10),
    });

    const start = new Date(
      target.getFullYear(),
      target.getMonth(),
      target.getDate(),
    );
    const end = new Date(
      target.getFullYear(),
      target.getMonth(),
      target.getDate(),
      23,
      59,
      59,
    );
    const expiring = await listCertificationsExpiringOn(start, end);
    const match = expiring.find((cert) => cert.vendorId === vendor.id);
    expect(match).toBeDefined();
    expect(match?.ownerEmail).toBe(OWNER_EMAIL);
    expect(match?.name).toBe("Expiring cert");
  });
});
