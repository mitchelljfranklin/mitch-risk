import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// API-key auth must not depend on a browser session — force the session path
// to miss so the Bearer-token branch is exercised against the real database.
vi.mock("@/lib/auth", () => ({ auth: async () => null }));

import { authenticateRequest } from "@/lib/api-auth";
import { generateApiKey, hashApiKey } from "@/lib/api-keys";
import { ensureSystemRoles, getRoleByName } from "@/lib/db/roles";
import { PERMISSIONS, SYSTEM_ROLE_NAMES } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const VIEWER_EMAIL = "apikey-viewer@example.test";
const KEY_NAME = "P64 full-access key";
const SCOPED_KEY_NAME = "P64 scoped key";

let fullKey = "";
let keyId = "";
let scopedKey = "";
let viewerId = "";

async function cleanup() {
  await prisma.apiKey.deleteMany({
    where: { name: { in: [KEY_NAME, SCOPED_KEY_NAME] } },
  });
  await prisma.user.deleteMany({ where: { email: VIEWER_EMAIL } });
}

beforeAll(async () => {
  await cleanup();
  await ensureSystemRoles();
  const viewerRole = await getRoleByName(SYSTEM_ROLE_NAMES.VIEWER);
  if (!viewerRole) throw new Error("viewer role not found");

  const viewer = await prisma.user.create({
    data: {
      name: "API Viewer",
      email: VIEWER_EMAIL,
      passwordHash: "x",
      roleId: viewerRole.id,
    },
  });
  viewerId = viewer.id;

  const generated = generateApiKey();
  fullKey = generated.fullKey;
  const key = await prisma.apiKey.create({
    data: {
      name: KEY_NAME,
      keyHash: await hashApiKey(fullKey),
      keyPrefix: generated.keyPrefix,
      prefix: generated.displayPrefix,
      createdBy: viewer.id,
    },
  });
  keyId = key.id;

  const scopedGenerated = generateApiKey();
  scopedKey = scopedGenerated.fullKey;
  const scopedApiKey = await prisma.apiKey.create({
    data: {
      name: SCOPED_KEY_NAME,
      keyHash: await hashApiKey(scopedKey),
      keyPrefix: scopedGenerated.keyPrefix,
      prefix: scopedGenerated.displayPrefix,
      createdBy: viewer.id,
      permissions: [PERMISSIONS.VENDORS_VIEW, PERMISSIONS.AUDIT_VIEW],
    },
  });
  await prisma.appSetting.upsert({
    where: { key: "api.enabled" },
    update: { value: true },
    create: { key: "api.enabled", category: "api", value: true },
  });
});

afterAll(async () => {
  await prisma.appSetting.deleteMany({ where: { key: "api.enabled" } });
  await cleanup();
  await prisma.$disconnect();
});

function bearerRequest(): Request {
  return new Request("http://localhost/api/v1/vendors", {
    headers: { authorization: `Bearer ${fullKey}` },
  });
}

function scopedBearerRequest(): Request {
  return new Request("http://localhost/api/v1/vendors", {
    headers: { authorization: `Bearer ${scopedKey}` },
  });
}

describe("API key authentication (integration)", () => {
  it("grants full access regardless of the creator's role", async () => {
    const auth = await authenticateRequest(bearerRequest());
    expect(auth).not.toBeNull();
    expect(auth?.method).toBe("apikey");
    expect(auth?.userId).toBe(viewerId);
    // Viewer creator, but the key can reach admin-only endpoints.
    expect(auth?.permissions).toContain(PERMISSIONS.API_MANAGE);
    expect(auth?.permissions).toContain(PERMISSIONS.ASSESSMENTS_DELETE);
    expect(auth?.permissions).toContain(PERMISSIONS.VENDORS_VIEW);
  });

  it("keeps working after the creating user is disabled", async () => {
    await prisma.user.update({
      where: { id: viewerId },
      data: { disabled: true },
    });
    const auth = await authenticateRequest(bearerRequest());
    expect(auth).not.toBeNull();
    expect(auth?.permissions).toContain(PERMISSIONS.API_MANAGE);
  });

  it("survives deletion of the creating user (createdBy set to null)", async () => {
    await prisma.user.delete({ where: { id: viewerId } });
    const orphaned = await prisma.apiKey.findUnique({ where: { id: keyId } });
    expect(orphaned).not.toBeNull();
    expect(orphaned?.createdBy).toBeNull();

    const auth = await authenticateRequest(bearerRequest());
    expect(auth).not.toBeNull();
    expect(auth?.userId).toBeNull();
    expect(auth?.permissions).toContain(PERMISSIONS.API_MANAGE);
  });

  it("scoped key has only the granted permissions", async () => {
    const auth = await authenticateRequest(scopedBearerRequest());
    expect(auth).not.toBeNull();
    expect(auth?.method).toBe("apikey");
    expect(auth?.permissions).toContain(PERMISSIONS.VENDORS_VIEW);
    expect(auth?.permissions).toContain(PERMISSIONS.AUDIT_VIEW);
    expect(auth?.permissions).not.toContain(PERMISSIONS.VENDORS_CREATE);
    expect(auth?.permissions).not.toContain(PERMISSIONS.API_MANAGE);
    expect(auth?.permissions).not.toContain(PERMISSIONS.ASSESSMENTS_DELETE);
  });

  it("scoped key lacks full access markers", async () => {
    const auth = await authenticateRequest(scopedBearerRequest());
    expect(auth).not.toBeNull();
    expect(auth?.permissions.length).toBe(2);
  });
});
