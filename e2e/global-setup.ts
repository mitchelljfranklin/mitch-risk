import "dotenv/config";

import { writeFileSync } from "node:fs";

import { createAssessment, sendAssessment } from "@/lib/db/assessments";
import { ensureSystemRoles, getRoleByName } from "@/lib/db/roles";
import {
  addQuestion,
  addSection,
  createTemplate,
  publishTemplate,
} from "@/lib/db/templates";
import { createUser } from "@/lib/db/users";
import { createVendor } from "@/lib/db/vendors";
import { SYSTEM_ROLE_NAMES } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { type QuestionInput } from "@/lib/schemas/template";
import {
  getAssessmentSettings,
  updateAssessmentSettings,
} from "@/lib/settings";

const E2E_VENDOR = "E2E Vendor";
const E2E_TEMPLATE = "E2E Template";
const TOKEN_FILE = "e2e/.portal-token";

export const E2E_VIEWER_EMAIL = "e2e-viewer@example.test";
export const E2E_VIEWER_PASSWORD = "viewer-password-12345";
export const E2E_ADMIN_EMAIL = "e2e-admin@example.test";
export const E2E_ADMIN_PASSWORD = "admin-password-12345";

function buildQuestion(
  overrides: Partial<QuestionInput> & Pick<QuestionInput, "text" | "type">,
): QuestionInput {
  return {
    helpText: "",
    riskWeight: "MEDIUM",
    required: true,
    options: [],
    expectedAnswer: "",
    conditionalLogic: { match: "all", rules: [] },
    controlIds: [],
    ...overrides,
  };
}

export default async function globalSetup() {
  // The suite signs in many times from one IP; raise the login throttle so the
  // per-IP rate limiter doesn't fail otherwise-unrelated tests.
  const assessmentSettings = await getAssessmentSettings();
  await updateAssessmentSettings({
    ...assessmentSettings,
    loginRateLimitPerMin: 1000,
  });

  await prisma.vendor.deleteMany({ where: { name: E2E_VENDOR } });
  await prisma.template.deleteMany({ where: { name: E2E_TEMPLATE } });

  await ensureSystemRoles();
  const viewerRole = await getRoleByName(SYSTEM_ROLE_NAMES.VIEWER);
  if (!viewerRole) {
    throw new Error("Viewer role not found during e2e setup.");
  }
  await prisma.user.deleteMany({ where: { email: E2E_VIEWER_EMAIL } });
  await createUser({
    name: "E2E Viewer",
    email: E2E_VIEWER_EMAIL,
    password: E2E_VIEWER_PASSWORD,
    roleId: viewerRole.id,
  });

  const adminRole = await getRoleByName(SYSTEM_ROLE_NAMES.ADMIN);
  if (!adminRole) {
    throw new Error("Admin role not found during e2e setup.");
  }
  await prisma.user.deleteMany({ where: { email: E2E_ADMIN_EMAIL } });
  await createUser({
    name: "E2E Admin",
    email: E2E_ADMIN_EMAIL,
    password: E2E_ADMIN_PASSWORD,
    roleId: adminRole.id,
  });

  const template = await createTemplate({
    name: E2E_TEMPLATE,
    description: "",
  });
  const section = await addSection(template.id, "General");
  await addQuestion(
    section.id,
    buildQuestion({
      text: "Do you enforce MFA?",
      type: "YES_NO",
      expectedAnswer: "YES",
    }),
  );
  await addQuestion(
    section.id,
    buildQuestion({ text: "Describe your access policy", type: "FREE_TEXT" }),
  );
  await addQuestion(
    section.id,
    buildQuestion({
      text: "Attach your policy document",
      type: "FILE_UPLOAD",
      required: false,
    }),
  );
  await publishTemplate(template.id);

  const vendor = await createVendor({
    name: E2E_VENDOR,
    contactName: "",
    contactEmail: "e2e@example.test",
    tier: "",
    website: "",
    notes: "",
  });
  const assessment = await createAssessment(vendor.id, {
    title: "E2E Assessment",
    templateId: template.id,
    dueDate: "",
    reviewerId: "",
  });
  await sendAssessment(assessment.id);

  const sent = await prisma.assessment.findUniqueOrThrow({
    where: { id: assessment.id },
    select: { accessToken: true },
  });
  writeFileSync(TOKEN_FILE, sent.accessToken ?? "", "utf8");

  await prisma.$disconnect();
}
