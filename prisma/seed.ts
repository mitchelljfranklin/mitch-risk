import {
  Prisma,
  PrismaClient,
  QuestionType,
  RiskWeight,
} from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { SYSTEM_ROLE_DEFINITIONS } from "../lib/permissions";
import { iso27001 } from "./seed-data/iso27001";
import { soc2 } from "./seed-data/soc2";
import { nistCsf } from "./seed-data/nist-csf";
import { essentialEight } from "./seed-data/essential-eight";
import { nistCsfFullTemplate } from "./seed-data/templates/nist-csf";
import { iso27001FullTemplate } from "./seed-data/templates/iso27001";
import { soc2FullTemplate } from "./seed-data/templates/soc2";
import { essentialEightFullTemplate } from "./seed-data/templates/essential-eight";
import { type FrameworkSeed, type TemplateSeed } from "./seed-data/types";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

type DefaultSetting = {
  category: string;
  key: string;
  value: Prisma.InputJsonValue;
  isSecret?: boolean;
};

const defaultSettings: DefaultSetting[] = [
  { category: "organization", key: "organization.name", value: "mitch-risk" },
  { category: "organization", key: "organization.supportEmail", value: "" },
  { category: "assessments", key: "assessments.defaultDueInDays", value: 21 },
  {
    category: "assessments",
    key: "assessments.reminderOffsetDays",
    value: [7, 1],
  },
  { category: "assessments", key: "assessments.escalationAfterDays", value: 3 },
  {
    category: "scoring",
    key: "scoring.riskWeights",
    value: { CRITICAL: 10, HIGH: 6, MEDIUM: 3, LOW: 1 },
  },
  {
    category: "scoring",
    key: "scoring.ragThresholds",
    value: { amber: 0.6, green: 0.85 },
  },
  { category: "scoring", key: "scoring.excludeNotApplicable", value: true },
  { category: "files", key: "files.maxUploadMb", value: 20 },
  {
    category: "files",
    key: "files.allowedExtensions",
    value: ["pdf", "png", "jpg", "jpeg", "docx", "xlsx"],
  },
  { category: "audit", key: "audit.retentionDays", value: 90 },
  { category: "appearance", key: "appearance.primaryHex", value: "" },
  { category: "appearance", key: "appearance.secondaryHex", value: "" },
  { category: "appearance", key: "appearance.logoKey", value: "" },
  { category: "api", key: "api.enabled", value: false },
  { category: "api", key: "api.defaultRateLimitPerMin", value: 30 },
  {
    category: "assessments",
    key: "assessments.loginRateLimitPerMin",
    value: 10,
  },
  {
    category: "assessments",
    key: "assessments.emailLogRetentionDays",
    value: 14,
  },
  {
    category: "assessments",
    key: "assessments.sessionTimeoutMinutes",
    value: 30,
  },
];

async function seedDefaultSettings() {
  for (const setting of defaultSettings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: {
        category: setting.category,
        isSecret: setting.isSecret ?? false,
      },
      create: {
        category: setting.category,
        key: setting.key,
        value: setting.value,
        isSecret: setting.isSecret ?? false,
      },
    });
  }

  console.log(`Seeded ${defaultSettings.length} default settings.`);
}

async function seedSystemRoles() {
  for (const definition of SYSTEM_ROLE_DEFINITIONS) {
    await prisma.role.upsert({
      where: { name: definition.name },
      update: {
        description: definition.description,
        permissions: [...definition.permissions],
        isSystem: true,
      },
      create: {
        name: definition.name,
        description: definition.description,
        permissions: [...definition.permissions],
        isSystem: true,
      },
    });
  }
  console.log(`Seeded ${SYSTEM_ROLE_DEFINITIONS.length} system roles.`);
}

async function seedFramework(framework: FrameworkSeed): Promise<number> {
  const record = await prisma.framework.upsert({
    where: {
      name_version: { name: framework.name, version: framework.version },
    },
    update: { description: framework.description },
    create: {
      name: framework.name,
      version: framework.version,
      description: framework.description,
    },
  });

  for (const [index, control] of framework.controls.entries()) {
    await prisma.control.upsert({
      where: {
        frameworkId_code: { frameworkId: record.id, code: control.code },
      },
      update: {
        domain: control.domain,
        title: control.title,
        guidance: control.guidance,
        order: index,
        isSharedResponsibility: control.isSharedResponsibility ?? false,
      },
      create: {
        frameworkId: record.id,
        domain: control.domain,
        code: control.code,
        title: control.title,
        guidance: control.guidance,
        order: index,
        isSharedResponsibility: control.isSharedResponsibility ?? false,
      },
    });
  }

  return framework.controls.length;
}

async function seedStarterTemplates() {
  const isoControls = await prisma.control.findMany({
    where: { framework: { name: "ISO 27001" } },
    orderBy: { order: "asc" },
    take: 18,
  });
  const soc2Controls = await prisma.control.findMany({
    where: { framework: { name: "SOC 2" } },
    orderBy: { order: "asc" },
    take: 14,
  });
  const nistControls = await prisma.control.findMany({
    where: { framework: { name: "NIST CSF" } },
    orderBy: { order: "asc" },
    take: 20,
  });
  const e8Controls = await prisma.control.findMany({
    where: { framework: { name: "Essential Eight" } },
    orderBy: { order: "asc" },
    take: 12,
  });

  const starterSetups = [
    {
      id: "starter-iso-27001",
      name: "ISO 27001 Starter",
      description:
        "Starter questionnaire covering ~18 Annex A controls across all four themes.",
      controls: isoControls,
      questions: [
        {
          text: "Do you maintain an inventory of all information assets?",
          type: "YES_NO",
          riskWeight: "HIGH" as const,
          controlIndex: 0,
        },
        {
          text: "Is information classified and labelled by sensitivity?",
          type: "YES_NO",
          riskWeight: "HIGH" as const,
          controlIndex: 8,
        },
        {
          text: "Are access rights reviewed at least quarterly?",
          type: "YES_NO",
          riskWeight: "CRITICAL" as const,
          controlIndex: 14,
        },
        {
          text: "Do you enforce MFA for all remote and privileged access?",
          type: "YES_NO",
          riskWeight: "CRITICAL" as const,
          controlIndex: 4,
        },
        {
          text: "How often are vulnerability scans performed?",
          type: "COMBOBOX",
          options: ["Daily", "Weekly", "Monthly", "Quarterly", "Never"],
          riskWeight: "HIGH" as const,
          controlIndex: 7,
        },
        {
          text: "Do you have a documented incident response plan?",
          type: "YES_NO",
          riskWeight: "CRITICAL" as const,
          controlIndex: 1,
        },
        {
          text: "Which backup strategy do you use?",
          type: "COMBOBOX",
          options: [
            "Off-site daily",
            "Off-site weekly",
            "Cloud based",
            "Local only",
            "None",
          ],
          riskWeight: "HIGH" as const,
          controlIndex: 12,
        },
        {
          text: "How do you encrypt data at rest? (select all that apply)",
          type: "MULTI_SELECT",
          options: [
            "Full disk encryption",
            "Database encryption",
            "Application-level encryption",
            "Field-level encryption",
            "Not encrypted",
          ],
          riskWeight: "CRITICAL" as const,
          controlIndex: 15,
        },
        {
          text: "Rate your patch management maturity (1 = ad‑hoc, 5 = fully automated)",
          type: "RATING",
          riskWeight: "MEDIUM" as const,
          controlIndex: 6,
        },
        {
          text: "Do you perform background checks on employees before hire?",
          type: "YES_NO",
          riskWeight: "MEDIUM" as const,
          controlIndex: 9,
        },
        {
          text: "What measures protect physical access to your data centres?",
          type: "FREE_TEXT",
          riskWeight: "HIGH" as const,
          controlIndex: 12,
        },
        {
          text: "Are development, test, and production environments separated?",
          type: "YES_NO",
          riskWeight: "HIGH" as const,
          controlIndex: 16,
        },
        {
          text: "Do you conduct penetration tests annually?",
          type: "YES_NO",
          riskWeight: "HIGH" as const,
          controlIndex: 5,
        },
        {
          text: "Which cloud services do you use? (select all that apply)",
          type: "MULTI_SELECT",
          options: ["AWS", "Azure", "GCP", "Private cloud", "On‑premise only"],
          riskWeight: "MEDIUM" as const,
          controlIndex: 17,
        },
        {
          text: "Describe your encryption key management process",
          type: "FREE_TEXT",
          riskWeight: "HIGH" as const,
          controlIndex: 15,
        },
        {
          text: "When was your last independent security review?",
          type: "DATE",
          riskWeight: "MEDIUM" as const,
          controlIndex: 3,
        },
        {
          text: "Are all employees required to complete annual security awareness training?",
          type: "YES_NO",
          riskWeight: "MEDIUM" as const,
          controlIndex: 10,
        },
        {
          text: "What is your target RTO for critical systems (hours)?",
          type: "NUMERIC",
          riskWeight: "HIGH" as const,
          controlIndex: 11,
        },
      ],
    },
    {
      id: "starter-soc-2",
      name: "SOC 2 Starter",
      description:
        "Starter questionnaire covering ~14 SOC 2 Trust Services Criteria.",
      controls: soc2Controls,
      questions: [
        {
          text: "Is a formal risk assessment performed at least annually?",
          type: "YES_NO",
          riskWeight: "HIGH" as const,
          controlIndex: 8,
        },
        {
          text: "Are logical access controls reviewed quarterly?",
          type: "YES_NO",
          riskWeight: "CRITICAL" as const,
          controlIndex: 0,
        },
        {
          text: "Do you restrict access based on least privilege?",
          type: "YES_NO",
          riskWeight: "CRITICAL" as const,
          controlIndex: 2,
        },
        {
          text: "Are system changes authorised, tested, and approved before deployment?",
          type: "YES_NO",
          riskWeight: "HIGH" as const,
          controlIndex: 6,
        },
        {
          text: "Do you monitor systems for security anomalies 24×7?",
          type: "COMBOBOX",
          options: [
            "24×7 SOC",
            "Business hours only",
            "Automated only",
            "None",
          ],
          riskWeight: "HIGH" as const,
          controlIndex: 4,
        },
        {
          text: "Is an incident response plan documented and tested annually?",
          type: "YES_NO",
          riskWeight: "HIGH" as const,
          controlIndex: 5,
        },
        {
          text: "Which of the following do you provide to customers? (select all)",
          type: "MULTI_SELECT",
          options: [
            "SOC 2 Type II report",
            "Penetration test summary",
            "Vulnerability scan results",
            "BCP / DR plan",
            "None",
          ],
          riskWeight: "MEDIUM" as const,
          controlIndex: 7,
        },
        {
          text: "Rate your vendor due‑diligence process (1 = informal, 5 = automated)",
          type: "RATING",
          riskWeight: "MEDIUM" as const,
          controlIndex: 3,
        },
        {
          text: "How are confidentiality commitments tracked and enforced?",
          type: "FREE_TEXT",
          riskWeight: "HIGH" as const,
          controlIndex: 10,
        },
        {
          text: "Is system capacity monitored and forecasted?",
          type: "YES_NO",
          riskWeight: "MEDIUM" as const,
          controlIndex: 1,
        },
        {
          text: "Are encryption keys rotated on a defined schedule?",
          type: "YES_NO",
          riskWeight: "HIGH" as const,
          controlIndex: 9,
        },
        {
          text: "Describe your change management process for production systems",
          type: "FREE_TEXT",
          riskWeight: "HIGH" as const,
          controlIndex: 6,
        },
        {
          text: "When did you last test your disaster recovery plan?",
          type: "DATE",
          riskWeight: "MEDIUM" as const,
          controlIndex: 11,
        },
        {
          text: "What is the maximum acceptable downtime (hours)?",
          type: "NUMERIC",
          riskWeight: "HIGH" as const,
          controlIndex: 13,
        },
      ],
    },
    {
      id: "starter-nist-csf",
      name: "NIST CSF 2.0 Starter",
      description:
        "Starter questionnaire covering ~20 NIST CSF 2.0 subcategories across all six functions.",
      controls: nistControls,
      questions: [
        {
          text: "Is your cybersecurity risk management program aligned with organizational strategy?",
          type: "YES_NO",
          riskWeight: "CRITICAL" as const,
          controlIndex: 0,
        },
        {
          text: "Do you maintain a current inventory of all hardware and software assets?",
          type: "YES_NO",
          riskWeight: "HIGH" as const,
          controlIndex: 1,
        },
        {
          text: "Are legal, regulatory, and contractual cybersecurity requirements documented?",
          type: "YES_NO",
          riskWeight: "HIGH" as const,
          controlIndex: 2,
        },
        {
          text: "Is multi-factor authentication enforced for all remote and privileged access?",
          type: "YES_NO",
          riskWeight: "CRITICAL" as const,
          controlIndex: 5,
        },
        {
          text: "How often are vulnerability scans performed on your environment?",
          type: "COMBOBOX",
          options: [
            "Continuous",
            "Daily",
            "Weekly",
            "Monthly",
            "Quarterly",
            "Never",
          ],
          riskWeight: "HIGH" as const,
          controlIndex: 7,
        },
        {
          text: "Do you have a documented and tested incident response plan?",
          type: "YES_NO",
          riskWeight: "CRITICAL" as const,
          controlIndex: 9,
        },
        {
          text: "Are cybersecurity requirements included in supplier and third-party agreements?",
          type: "YES_NO",
          riskWeight: "HIGH" as const,
          controlIndex: 23,
        },
        {
          text: "Which data protection measures do you have in place? (select all that apply)",
          type: "MULTI_SELECT",
          options: [
            "Encryption at rest",
            "Encryption in transit",
            "Data loss prevention",
            "Access controls",
            "Classification and labelling",
            "None",
          ],
          riskWeight: "CRITICAL" as const,
          controlIndex: 24,
        },
        {
          text: "Rate your cybersecurity awareness training program (1 = ad‑hoc, 5 = continuous)",
          type: "RATING",
          riskWeight: "MEDIUM" as const,
          controlIndex: 25,
        },
        {
          text: "Do you conduct background checks on personnel with privileged access?",
          type: "YES_NO",
          riskWeight: "MEDIUM" as const,
          controlIndex: 15,
        },
        {
          text: "Describe your approach to supply chain cybersecurity risk management",
          type: "FREE_TEXT",
          riskWeight: "HIGH" as const,
          controlIndex: 22,
        },
        {
          text: "Are development, test, and production environments separated?",
          type: "YES_NO",
          riskWeight: "HIGH" as const,
          controlIndex: 26,
        },
        {
          text: "Do you maintain and test data backups on a regular schedule?",
          type: "YES_NO",
          riskWeight: "CRITICAL" as const,
          controlIndex: 3,
        },
        {
          text: "Which security monitoring capabilities do you operate? (select all)",
          type: "MULTI_SELECT",
          options: [
            "Network monitoring",
            "Endpoint detection",
            "SIEM/SOAR",
            "User behaviour analytics",
            "File integrity monitoring",
            "None",
          ],
          riskWeight: "HIGH" as const,
          controlIndex: 4,
        },
        {
          text: "Describe your secure software development lifecycle",
          type: "FREE_TEXT",
          riskWeight: "HIGH" as const,
          controlIndex: 8,
        },
        {
          text: "When was your last independent security assessment or penetration test?",
          type: "DATE",
          riskWeight: "MEDIUM" as const,
          controlIndex: 6,
        },
        {
          text: "Is access to systems based on least privilege and reviewed regularly?",
          type: "YES_NO",
          riskWeight: "CRITICAL" as const,
          controlIndex: 10,
        },
        {
          text: "What is your maximum acceptable recovery time objective (RTO) in hours?",
          type: "NUMERIC",
          riskWeight: "HIGH" as const,
          controlIndex: 21,
        },
        {
          text: "Are recovery plans tested through exercises at least annually?",
          type: "YES_NO",
          riskWeight: "HIGH" as const,
          controlIndex: 19,
        },
        {
          text: "Do you participate in threat intelligence sharing communities?",
          type: "YES_NO",
          riskWeight: "MEDIUM" as const,
          controlIndex: 18,
        },
      ],
    },
    {
      id: "starter-essential-eight",
      name: "Essential Eight Starter",
      description:
        "Starter questionnaire covering ~12 Essential Eight controls across all eight mitigation strategies.",
      controls: e8Controls,
      questions: [
        {
          text: "Is application control implemented to prevent unapproved software execution?",
          type: "YES_NO",
          riskWeight: "HIGH" as const,
          controlIndex: 0,
        },
        {
          text: "Are critical application vulnerabilities patched within 48 hours?",
          type: "YES_NO",
          riskWeight: "CRITICAL" as const,
          controlIndex: 2,
        },
        {
          text: "Are Microsoft Office macros from the internet blocked?",
          type: "YES_NO",
          riskWeight: "HIGH" as const,
          controlIndex: 3,
        },
        {
          text: "Is multi-factor authentication enforced for all users?",
          type: "YES_NO",
          riskWeight: "CRITICAL" as const,
          controlIndex: 5,
        },
        {
          text: "Which MFA methods do you support? (select all)",
          type: "MULTI_SELECT",
          options: [
            "FIDO2 security keys",
            "Authenticator app",
            "SMS",
            "Hardware token",
            "Certificate-based",
            "None",
          ],
          riskWeight: "HIGH" as const,
          controlIndex: 6,
        },
        {
          text: "How often do you verify the integrity and restorability of backups?",
          type: "COMBOBOX",
          options: [
            "Daily",
            "Weekly",
            "Monthly",
            "Quarterly",
            "Annually",
            "Never",
          ],
          riskWeight: "HIGH" as const,
          controlIndex: 7,
        },
        {
          text: "Are privileged admin accounts prevented from accessing the internet and email?",
          type: "YES_NO",
          riskWeight: "HIGH" as const,
          controlIndex: 8,
        },
        {
          text: "Are web browsers and Microsoft Office hardened per vendor guidance?",
          type: "YES_NO",
          riskWeight: "MEDIUM" as const,
          controlIndex: 1,
        },
        {
          text: "Rate your patch management maturity (1 = ad‑hoc, 5 = fully automated)",
          type: "RATING",
          riskWeight: "MEDIUM" as const,
          controlIndex: 4,
        },
        {
          text: "When did you last test your ability to restore critical systems from backups?",
          type: "DATE",
          riskWeight: "MEDIUM" as const,
          controlIndex: 9,
        },
        {
          text: "What percentage of your fleet runs supported operating systems?",
          type: "NUMERIC",
          riskWeight: "HIGH" as const,
          controlIndex: 10,
        },
        {
          text: "Describe your process for managing privileged administrative access",
          type: "FREE_TEXT",
          riskWeight: "HIGH" as const,
          controlIndex: 11,
        },
      ],
    },
  ];

  for (const setup of starterSetups) {
    const template = await prisma.template.upsert({
      where: { id: setup.id },
      update: { description: setup.description, status: "PUBLISHED" },
      create: {
        id: setup.id,
        name: setup.name,
        description: setup.description,
        status: "PUBLISHED",
        version: 1,
      },
    });

    const sectionCount = await prisma.section.count({
      where: { templateId: template.id },
    });
    if (sectionCount > 0) continue;

    const section = await prisma.section.create({
      data: { templateId: template.id, title: "Core controls", order: 0 },
    });

    for (const question of setup.questions) {
      const control = setup.controls[question.controlIndex];
      if (!control) continue;

      let expectedAnswer: unknown = undefined;
      const options =
        "options" in question ? (question.options as string[]) : [];
      const type = question.type;

      if (type === "YES_NO") expectedAnswer = "YES";
      else if (type === "COMBOBOX") expectedAnswer = options[0];
      else if (type === "MULTI_SELECT") expectedAnswer = options.slice(0, 2);

      await prisma.question.create({
        data: {
          sectionId: section.id,
          text: question.text,
          type: question.type as QuestionType,
          riskWeight: question.riskWeight as RiskWeight,
          required: true,
          expectedAnswer:
            expectedAnswer !== undefined
              ? (expectedAnswer as Prisma.InputJsonValue)
              : Prisma.DbNull,
          options: options as Prisma.InputJsonValue,
          order: 0,
          controls: { create: [{ controlId: control.id }] },
        },
      });
    }

    console.log(`Seeded richer starter template for ${setup.name}.`);
  }
}

const fullTemplates: TemplateSeed[] = [
  nistCsfFullTemplate,
  iso27001FullTemplate,
  soc2FullTemplate,
  essentialEightFullTemplate,
];

async function seedFullTemplates() {
  for (const templateSeed of fullTemplates) {
    const template = await prisma.template.upsert({
      where: { id: templateSeed.id },
      update: { description: templateSeed.description, status: "PUBLISHED" },
      create: {
        id: templateSeed.id,
        name: templateSeed.name,
        description: templateSeed.description,
        status: "PUBLISHED",
        version: 1,
      },
    });

    const existingQuestions = await prisma.question.count({
      where: { section: { templateId: template.id } },
    });
    if (existingQuestions > 0) continue;

    const framework = await prisma.framework.findFirst({
      where: { name: templateSeed.frameworkName },
      select: { id: true },
    });
    if (!framework) {
      console.warn(
        `Framework "${templateSeed.frameworkName}" not found, skipping full template "${templateSeed.name}".`,
      );
      continue;
    }

    const controlCodes = templateSeed.sections.flatMap((section) =>
      section.questions.map((question) => question.controlCode),
    );
    const controls = await prisma.control.findMany({
      where: { frameworkId: framework.id, code: { in: controlCodes } },
      select: { id: true, code: true },
    });
    const controlByCode = new Map(
      controls.map((control) => [control.code, control.id]),
    );

    let questionCount = 0;
    for (const [sectionIndex, sectionSeed] of templateSeed.sections.entries()) {
      const section = await prisma.section.create({
        data: {
          templateId: template.id,
          title: sectionSeed.title,
          order: sectionIndex,
        },
      });

      for (const [questionIndex, question] of sectionSeed.questions.entries()) {
        const controlId = controlByCode.get(question.controlCode);
        if (!controlId) {
          console.warn(
            `Control "${question.controlCode}" not found for full template "${templateSeed.name}", skipping question.`,
          );
          continue;
        }

        await prisma.question.create({
          data: {
            sectionId: section.id,
            text: question.text,
            type: question.type as QuestionType,
            riskWeight: question.riskWeight as RiskWeight,
            required: true,
            expectedAnswer: question.expectedAnswer as Prisma.InputJsonValue,
            options: (question.options ?? []) as Prisma.InputJsonValue,
            order: questionIndex,
            controls: { create: [{ controlId }] },
          },
        });
        questionCount += 1;
      }
    }

    console.log(
      `Seeded full template "${templateSeed.name}" (${questionCount} questions).`,
    );
  }
}

async function main() {
  await seedSystemRoles();
  await seedDefaultSettings();
  const isoControls = await seedFramework(iso27001);
  const soc2Controls = await seedFramework(soc2);
  const nistControls = await seedFramework(nistCsf);
  const e8Controls = await seedFramework(essentialEight);
  await seedStarterTemplates();
  await seedFullTemplates();
  console.log(
    `Seeded ${iso27001.name} (${isoControls} controls), ${soc2.name} (${soc2Controls} controls), ${nistCsf.name} (${nistControls} controls), ${essentialEight.name} (${e8Controls} controls).`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
