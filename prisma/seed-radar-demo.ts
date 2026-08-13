// One-off seed script to populate the database with full-framework assessments
// so the compliance radar can be reviewed visually.
//
// Run: npx tsx prisma/seed-radar-demo.ts          — create demo data (idempotent)
//      npx tsx prisma/seed-radar-demo.ts --reset  — delete all radar demo data first
//
// Prerequisites: `npm run db:seed` must have been run at least once so the
// ISO 27001 and NIST CSF frameworks (and their controls) exist.

import "dotenv/config";

import { prisma } from "../lib/prisma";
import {
  createAssessment,
  saveResponses,
  sendAssessment,
  submitAssessment,
} from "../lib/db/assessments";
import {
  addQuestion,
  addSection,
  createTemplate,
  publishTemplate,
} from "../lib/db/templates";
import { createVendor } from "../lib/db/vendors";
import { scoreAssessment } from "../lib/db/scoring";
import { RISK_WEIGHTS } from "../lib/schemas/template";

const PREFIX = "Radar Demo";
const SHOULD_RESET = process.argv.includes("--reset");

type Profile = "predictable" | "random";

function monthsAgo(months: number): Date {
  return new Date(Date.now() - months * 30.44 * 24 * 60 * 60 * 1000);
}

async function resetIfRequested() {
  if (!SHOULD_RESET) return;
  const deleted = await prisma.vendor.deleteMany({
    where: { name: { startsWith: PREFIX } },
  });
  console.log(`Deleted ${deleted.count} radar demo vendors.`);
}

async function createFullFrameworkTemplate(
  frameworkName: string,
  label: string,
): Promise<{ templateId: string }> {
  const framework = await prisma.framework.findFirst({
    where: { name: frameworkName },
  });
  if (!framework) {
    throw new Error(
      `Framework "${frameworkName}" not found. Run db:seed first.`,
    );
  }

  const controls = await prisma.control.findMany({
    where: { frameworkId: framework.id },
    orderBy: { order: "asc" },
  });
  if (controls.length === 0) {
    throw new Error(`Framework "${frameworkName}" has no controls.`);
  }

  const template = await createTemplate({
    name: `${PREFIX} ${label} (Full)`,
    description: `Full ${frameworkName} framework — one question per control.`,
  });

  const byDomain = new Map<string, typeof controls>();
  for (const control of controls) {
    const list = byDomain.get(control.domain) ?? [];
    list.push(control);
    byDomain.set(control.domain, list);
  }

  let globalIndex = 0;
  for (const [domain, domainControls] of byDomain.entries()) {
    const section = await addSection(template.id, domain);
    for (const control of domainControls) {
      const riskWeight = RISK_WEIGHTS[globalIndex % RISK_WEIGHTS.length];
      await addQuestion(section.id, {
        text: `${control.code} — ${control.title}?`,
        helpText: "",
        type: "YES_NO",
        riskWeight,
        required: true,
        options: [],
        expectedAnswer: "YES",
        conditionalLogic: { match: "all", rules: [] },
        controlIds: [control.id],
      });
      globalIndex += 1;
    }
  }

  await publishTemplate(template.id);
  console.log(
    `  Template "${template.name}": ${controls.length} questions across ${byDomain.size} domains.`,
  );
  return { templateId: template.id };
}

function yesNoAnswer(
  index: number,
  isPrevious: boolean,
  profile: Profile,
): string {
  if (profile === "predictable") {
    const period = isPrevious ? 3 : 7;
    return index % period === 0 ? "NO" : "YES";
  }
  return Math.random() < 0.35 ? "NO" : "YES";
}

async function createCompletedAssessment(
  vendorId: string,
  templateId: string,
  title: string,
  profile: Profile,
  isPrevious: boolean,
  submittedAt: Date,
): Promise<void> {
  const assessment = await createAssessment(vendorId, {
    title,
    templateId,
    dueDate: "",
    reviewerId: "",
  });
  await sendAssessment(assessment.id);

  const sent = await prisma.assessment.findUniqueOrThrow({
    where: { id: assessment.id },
    select: { id: true, accessToken: true },
  });
  if (!sent.accessToken) throw new Error("no access token generated");

  const questions = await prisma.assessmentQuestion.findMany({
    where: { assessmentId: sent.id },
    orderBy: { order: "asc" },
  });

  const answers = questions.map((question, index) => ({
    assessmentQuestionId: question.id,
    value: yesNoAnswer(index, isPrevious, profile),
    isNotApplicable: false,
  }));

  await saveResponses(sent.accessToken, answers);
  await submitAssessment(sent.accessToken);

  await prisma.assessment.update({
    where: { id: sent.id },
    data: { status: "COMPLETED", submittedAt },
  });
  await scoreAssessment(sent.id);
}

async function createDemoVendor(name: string, note: string): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: { permissions: { has: "settings:manage" } } },
    select: { id: true },
  });

  const vendor = await createVendor({
    name,
    contactName: "Radar Demo Contact",
    contactEmail: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@example.test`,
    tier: "HIGH",
    website: "",
    notes: note,
    serviceDescription: "Demo vendor for compliance radar review",
    dataSensitivity: "CONFIDENTIAL",
    contractRenewalDate: "",
    ownerId: admin?.id ?? "",
  });

  return vendor.id;
}

async function addFrameworkAssessments(
  vendorId: string,
  frameworkName: string,
  templateId: string,
  profile: Profile,
): Promise<void> {
  await createCompletedAssessment(
    vendorId,
    templateId,
    `${frameworkName} assessment (current)`,
    profile,
    false,
    new Date(),
  );
  await createCompletedAssessment(
    vendorId,
    templateId,
    `${frameworkName} assessment (previous)`,
    profile,
    true,
    monthsAgo(6),
  );
  console.log(`    ${frameworkName}: 2 completed assessments.`);
}

async function main() {
  console.log("=== Radar demo seed ===");

  await resetIfRequested();

  const existing = await prisma.vendor.count({
    where: { name: { startsWith: PREFIX } },
  });
  if (existing > 0) {
    console.log(
      `Found ${existing} existing radar demo vendors — nothing to do. Use --reset to regenerate.`,
    );
    await prisma.$disconnect();
    return;
  }

  console.log("Creating full-framework templates...");
  const iso = await createFullFrameworkTemplate("ISO 27001", "ISO 27001");
  const nist = await createFullFrameworkTemplate("NIST CSF", "NIST CSF");

  console.log("\nCreating vendors and assessments...");

  const isoVendorId = await createDemoVendor(
    `${PREFIX} — ISO 27001`,
    "Predictable profile for the full ISO 27001 framework.",
  );
  console.log(`  Vendor "${PREFIX} — ISO 27001":`);
  await addFrameworkAssessments(
    isoVendorId,
    "ISO 27001",
    iso.templateId,
    "predictable",
  );

  const nistVendorId = await createDemoVendor(
    `${PREFIX} — NIST CSF`,
    "Random profile for the full NIST CSF framework.",
  );
  console.log(`  Vendor "${PREFIX} — NIST CSF":`);
  await addFrameworkAssessments(
    nistVendorId,
    "NIST CSF",
    nist.templateId,
    "random",
  );

  const multiVendorId = await createDemoVendor(
    `${PREFIX} — Multi-Framework`,
    "Holds both ISO 27001 (predictable) and NIST CSF (random) frameworks.",
  );
  console.log(`  Vendor "${PREFIX} — Multi-Framework":`);
  await addFrameworkAssessments(
    multiVendorId,
    "ISO 27001",
    iso.templateId,
    "predictable",
  );
  await addFrameworkAssessments(
    multiVendorId,
    "NIST CSF",
    nist.templateId,
    "random",
  );

  console.log("\n=== Done! ===");
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
