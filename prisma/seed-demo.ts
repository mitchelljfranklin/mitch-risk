// Demo-data seed script for populating a dashboard with realistic vendor risk data.
// Run: npx tsx prisma/seed-demo.ts         — create demo data (idempotent)
//      npx tsx prisma/seed-demo.ts --reset — delete all demo data first, then create
//
// Prerequisites: `npm run db:seed` must have been run at least once to ensure
// starter templates and system roles exist.

import { prisma } from "../lib/prisma";
import {
  createAssessment,
  saveResponses,
  sendAssessment,
  submitAssessment,
} from "../lib/db/assessments";
import { createVendor } from "../lib/db/vendors";
import { createCertification } from "../lib/db/certifications";
import { scoreAssessment } from "../lib/db/scoring";

const DEMO_PREFIX = "Demo ";
const SHOULD_RESET = process.argv.includes("--reset");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function pickWeighted<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let randomValue = Math.random() * total;
  for (const [key, weight] of entries) {
    randomValue -= weight;
    if (randomValue <= 0) return key;
  }
  return entries[0]![0];
}

function randomDate(startMonthsBack: number, endMonthsBack: number): Date {
  const minutesBack = randomInt(
    Math.round(startMonthsBack * 30.44 * 24 * 60),
    Math.round(endMonthsBack * 30.44 * 24 * 60),
  );
  return new Date(Date.now() - minutesBack * 60_000);
}

function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------

const VENDOR_NAMES = [
  "CloudSync",
  "DataVault",
  "NetShield",
  "AppForge",
  "CyberMesh",
  "VerifyPro",
  "StreamLine",
  "CodeBastion",
  "InfraGuard",
  "LogiCore",
  "SentryOps",
  "BridgeWare",
  "PixelSafe",
  "ApexHost",
  "HelixData",
  "FusionGrid",
  "NovaLink",
  "QuantumShield",
  "RidgeNet",
  "SignalEdge",
  "TerraForm",
  "VectorOps",
  "WaveGuard",
  "ZenithCloud",
  "AgileFort",
  "BinaryPeak",
  "CipherVault",
  "DeltaHost",
  "EchoNet",
  "FluxSecure",
  "GridOps",
  "HarborIT",
  "IronClad",
  "JunctionCloud",
  "KeyVault",
  "LockMesh",
  "MatrixDefend",
  "NodeSecure",
  "OmniGuard",
  "PrismHost",
  "QuarryNet",
  "ReactorOps",
  "SteelVault",
  "ThunderGrid",
  "UnitForce",
  "VaultLine",
  "WardenCloud",
  "XenonHost",
  "YieldNet",
  "ZoneDefender",
];

const SERVICE_DESCRIPTIONS = [
  "Cloud infrastructure and hosting",
  "Payment processing gateway",
  "Customer identity management",
  "Marketing automation platform",
  "HR and payroll SaaS",
  "Data analytics and reporting",
  "Email delivery service",
  "Document management and e-signatures",
  "IT service desk and ticketing",
  "CRM platform",
  "ERP system integration",
  "Security awareness training",
  "Threat intelligence feed",
  "Code repository hosting",
  "Continuous integration pipeline",
  "CDN and edge computing",
  "Video conferencing platform",
  "Inventory management system",
  "Project management SaaS",
  "Compliance automation tool",
];

const SENSITIVITY_WEIGHTS: Record<string, number> = {
  PUBLIC: 10,
  INTERNAL: 15,
  CONFIDENTIAL: 15,
  RESTRICTED: 10,
};

type AssessmentProfile = "good" | "bad" | "mixed" | "partial";

const PROFILE_WEIGHTS: Record<AssessmentProfile, number> = {
  good: 35,
  bad: 20,
  mixed: 25,
  partial: 20,
};

const TEMPLATE_IDS = [
  "starter-iso-27001",
  "starter-soc-2",
  "starter-nist-csf",
  "starter-essential-eight",
];

const CERTIFICATION_NAMES = [
  "SOC 2 Type II",
  "ISO 27001",
  "ISO 27017",
  "PCI DSS",
  "HIPAA",
  "FedRAMP",
  "Cyber Essentials Plus",
  "CCPA Compliance",
  "EU-US Data Privacy Framework",
];

const CERTIFICATION_ISSUERS = [
  "AICPA",
  "BSI Group",
  "Coalfire",
  "Schellman",
  "Deloitte",
  "PwC",
  "EY",
  "KPMG",
];

// ---------------------------------------------------------------------------
// Response generation
// ---------------------------------------------------------------------------

function generateYesNoResponse(
  expected: unknown,
  profile: AssessmentProfile,
): string {
  if (profile === "good") return "YES";
  if (profile === "bad") return expected === "YES" ? "NO" : "YES";
  return Math.random() > 0.5 ? "YES" : "NO";
}

function generateComboResponse(
  options: string[],
  expected: unknown,
  profile: AssessmentProfile,
): string {
  if (profile === "good") return String(expected ?? options[0] ?? "");
  if (profile === "bad") return options[options.length - 1] ?? "None";
  return pick(options);
}

function generateMultiSelectResponse(
  options: string[],
  expected: unknown,
  profile: AssessmentProfile,
): string[] {
  const expectedArr = Array.isArray(expected) ? expected : [String(expected)];
  if (profile === "good") return expectedArr.slice(0, 2).filter(Boolean);
  if (profile === "bad") return [options[options.length - 1] ?? "None"];
  const count = randomInt(1, Math.min(3, options.length));
  const shuffled = [...options].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateNumericResponse(
  expected: unknown,
  profile: AssessmentProfile,
): number {
  if (profile === "good") return Number(expected ?? randomInt(1, 24));
  if (profile === "bad") return Number(expected ?? 999) + randomInt(50, 500);
  return randomInt(1, 100);
}

function generateRatingResponse(profile: AssessmentProfile): number {
  if (profile === "good") return randomInt(4, 5);
  if (profile === "bad") return randomInt(1, 2);
  return randomInt(1, 5);
}

function generateFreeTextResponse(profile: AssessmentProfile): string {
  if (profile === "good")
    return "Full documentation is maintained and reviewed quarterly. All procedures are documented and tested at least annually with independent validation.";
  if (profile === "bad") return "No formal process. Ad-hoc.";
  return "Partial controls in place. Some areas documented but not consistently enforced.";
}

function generateDateResponse(profile: AssessmentProfile): string {
  if (profile === "good") return daysFromNow(-randomInt(30, 180));
  if (profile === "bad") return "2020-01-01";
  return daysFromNow(-randomInt(30, 365));
}

function generateCheckboxResponse(
  expected: unknown,
  profile: AssessmentProfile,
): string {
  if (profile === "good") return expected === true ? "checked" : "true";
  if (profile === "bad") return "false";
  return String(Math.random() > 0.5);
}

function generateEmailResponse(profile: AssessmentProfile): string {
  if (profile === "good") return "security@example.com";
  if (profile === "bad") return "";
  return "operations@example.com";
}

function generateUrlResponse(profile: AssessmentProfile): string {
  if (profile === "good") return "https://trust.example.com/security";
  if (profile === "bad") return "";
  return "https://example.com/policies";
}

// ---------------------------------------------------------------------------
// Main seed logic
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Demo data seed ===");

  if (SHOULD_RESET) {
    console.log("Resetting demo data...");
    const del = await prisma.vendor.deleteMany({
      where: { name: { startsWith: DEMO_PREFIX } },
    });
    console.log(`Deleted ${del.count} demo vendors.`);
  }

  const existing = await prisma.vendor.count({
    where: { name: { startsWith: DEMO_PREFIX } },
  });
  if (existing > 0) {
    console.log(
      `Found ${existing} existing demo vendors — nothing to do. Use --reset to regenerate.`,
    );
    await prisma.$disconnect();
    return;
  }

  // Find an admin user to own vendors and be the reviewer.
  const admin = await prisma.user.findFirst({
    where: { role: { permissions: { has: "settings:manage" } } },
    select: { id: true, name: true },
  });
  if (!admin) {
    console.error("No admin user found. Run `npm run db:seed` first.");
    process.exit(1);
  }
  console.log(`Using reviewer: ${admin.name} (${admin.id})`);

  // Verify starter templates exist.
  for (const tid of TEMPLATE_IDS) {
    const template = await prisma.template.findUnique({ where: { id: tid } });
    if (!template) {
      console.error(`Template ${tid} not found. Run npm run db:seed first.`);
      process.exit(1);
    }
  }

  // -----------------------------------------------------------------------
  // Create vendors
  // -----------------------------------------------------------------------
  console.log("\nCreating 50 vendors...");
  const vendorResults: string[] = [];
  for (let i = 0; i < 50; i++) {
    const name = `${DEMO_PREFIX}${VENDOR_NAMES[i]}`;
    const tier =
      i >= 45 ? "CRITICAL" : i >= 35 ? "HIGH" : i >= 15 ? "MEDIUM" : "LOW";
    const dataSensitivity = pickWeighted(SENSITIVITY_WEIGHTS);
    const contractDays = randomInt(60, 540);
    const renewalDate =
      contractDays > 365
        ? daysFromNow(contractDays)
        : Math.random() > 0.5
          ? daysFromNow(contractDays)
          : ""; // ~50% no contract date

    const vendor = await createVendor({
      name,
      contactName: `Contact ${i + 1}`,
      contactEmail: `vendor-${i + 1}@example.test`,
      tier,
      website: `https://${name.toLowerCase().replace(/\s/g, "-")}.example.com`,
      notes: "",
      serviceDescription: pick(SERVICE_DESCRIPTIONS),
      dataSensitivity,
      contractRenewalDate: renewalDate || "",
      ownerId: admin.id,
    } as Parameters<typeof createVendor>[0]);
    vendorResults.push(vendor.id);
  }
  console.log("  done.");

  // -----------------------------------------------------------------------
  // Create assessments
  // -----------------------------------------------------------------------
  console.log("\nCreating assessments with responses...");
  let assessmentCount = 0;
  const submitted: string[] = [];
  const inProgress: string[] = [];

  const TEMPLATE_TITLE_MAP: Record<string, string> = {
    "starter-iso-27001": "ISO 27001",
    "starter-soc-2": "SOC 2",
    "starter-nist-csf": "NIST CSF",
    "starter-essential-eight": "Essential Eight",
  };

  for (let i = 0; i < 50; i++) {
    const vendorId = vendorResults[i];
    const templateId = pick(TEMPLATE_IDS);
    const profile = pickWeighted(PROFILE_WEIGHTS);
    const assessmentCountForVendor = i < 15 ? 2 : 1; // 30% get 2 assessments

    for (
      let assessmentIndex = 0;
      assessmentIndex < assessmentCountForVendor;
      assessmentIndex++
    ) {
      const date = assessmentIndex === 0 ? randomDate(6, 0) : randomDate(6, 3); // Second assessment is older
      const assessment = await createAssessment(vendorId, {
        title: `${TEMPLATE_TITLE_MAP[templateId] ?? "ISO 27001"} assessment`,
        templateId,
        dueDate: daysFromNow(21),
        reviewerId: admin.id,
      });

      // Set createdAt to a past date for the heatmap.
      await prisma.assessment.update({
        where: { id: assessment.id },
        data: { createdAt: date, updatedAt: date },
      });

      if (profile === "partial") {
        // Leave as DRAFT (in-progress, no token yet).
        await sendAssessment(assessment.id);
        inProgress.push(assessment.id);
        assessmentCount++;
        process.stdout.write(`  v${i + 1}/${assessmentIndex + 1}: PARTIAL `);
        continue;
      }

      // Full lifecycle: send → respond → submit → score
      await sendAssessment(assessment.id);
      const sent = await prisma.assessment.findUniqueOrThrow({
        where: { id: assessment.id },
        select: { id: true, accessToken: true },
      });

      const templateQuestions = await prisma.assessmentQuestion.findMany({
        where: { assessmentId: sent.id },
      });

      const answers: {
        assessmentQuestionId: string;
        value: string | number | boolean | string[] | null;
        isNotApplicable: boolean;
      }[] = [];
      for (const templateQuestion of templateQuestions) {
        const type = templateQuestion.type;
        const expected = templateQuestion.expectedAnswer;
        let value: string | number | boolean | string[] | null;

        switch (type) {
          case "YES_NO":
            value = generateYesNoResponse(expected, profile);
            break;
          case "COMBOBOX":
            value = generateComboResponse(
              templateQuestion.options as string[],
              expected,
              profile,
            );
            break;
          case "MULTI_SELECT":
            value = generateMultiSelectResponse(
              templateQuestion.options as string[],
              expected,
              profile,
            );
            break;
          case "NUMERIC":
            value = generateNumericResponse(expected, profile);
            break;
          case "RATING":
            value = generateRatingResponse(profile);
            break;
          case "FREE_TEXT":
            value = generateFreeTextResponse(profile);
            break;
          case "DATE":
            value = generateDateResponse(profile);
            break;
          case "CHECKBOX":
            value = generateCheckboxResponse(expected, profile);
            break;
          case "URL":
            value = generateUrlResponse(profile);
            break;
          case "EMAIL":
            value = generateEmailResponse(profile);
            break;
          default:
            value = generateYesNoResponse(expected, profile);
        }

        answers.push({
          assessmentQuestionId: templateQuestion.id,
          value,
          isNotApplicable: false,
        });
      }

      if (!sent.accessToken) continue;
      await saveResponses(sent.accessToken, answers);
      const submittedCheck = await submitAssessment(sent.accessToken);
      if (submittedCheck.ok) {
        // Advance some beyond SUBMITTED.
        const statusRoll = Math.random();
        if (statusRoll < 0.4) {
          await prisma.assessment.update({
            where: { id: sent.id },
            data: { status: "COMPLETED" },
          });
        } else if (statusRoll < 0.7) {
          await prisma.assessment.update({
            where: { id: sent.id },
            data: { status: "UNDER_REVIEW" },
          });
        }
        await scoreAssessment(sent.id);
        submitted.push(sent.id);
      }

      assessmentCount++;
      process.stdout.write(
        `  v${i + 1}/${assessmentIndex + 1}: ${profile.toUpperCase()} `,
      );
    }
  }

  console.log(
    `\n  Created ${assessmentCount} assessments (${submitted.length} scored, ${inProgress.length} in-progress).`,
  );

  // -----------------------------------------------------------------------
  // Create certifications
  // -----------------------------------------------------------------------
  console.log("\nCreating certifications...");
  const certVendorCount = randomInt(10, 15);
  const certVendors = [...vendorResults]
    .sort(() => Math.random() - 0.5)
    .slice(0, certVendorCount);
  let certCount = 0;
  for (const vId of certVendors) {
    const name = pick(CERTIFICATION_NAMES);
    const issuer = pick(CERTIFICATION_ISSUERS);
    const expiryDays = randomInt(-30, 365); // some already expired, some upcoming
    const issuedDays = expiryDays - randomInt(365, 730); // 1-2 years before expiry
    await createCertification(vId, {
      name,
      issuer,
      issuedDate: daysFromNow(
        issuedDays < todayDays() ? issuedDays : todayDays() - 730,
      ),
      expiresDate: daysFromNow(expiryDays),
    });
    certCount++;
  }
  console.log(
    `  Created ${certCount} certifications for ${certVendorCount} vendors.`,
  );

  // Update portfolio scores.
  console.log("\nUpdating vendor portfolio scores...");
  const scoredVendors = await prisma.assessment.groupBy({
    by: ["vendorId"],
    where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "COMPLETED"] } },
    _avg: { score: true },
  });
  for (const scoredVendor of scoredVendors) {
    if (scoredVendor._avg.score !== null) {
      await prisma.vendor.update({
        where: { id: scoredVendor.vendorId },
        data: { overallScore: scoredVendor._avg.score },
      });
    }
  }
  console.log(`  Updated ${scoredVendors.length} vendor scores.`);

  console.log("\n=== Done! ===");
  await prisma.$disconnect();
}

function todayDays(): number {
  return Math.floor(Date.now() / 86_400_000) * 86_400_000;
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
