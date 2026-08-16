import type { RiskWeight } from "../../generated/prisma/client";
import { type TemplateQuestionSeed, type TemplateSeed } from "../types";

const COMPLIANCE_OPTIONS = ["Does Not Meet", "Partially Meets", "Meets"];
const COMPLIANCE_ACCEPTED = ["Meets"];

function complianceQuestion(
  text: string,
  controlCode: string,
  riskWeight: RiskWeight,
): TemplateQuestionSeed {
  return {
    text,
    type: "MULTIPLE_CHOICE",
    riskWeight,
    options: COMPLIANCE_OPTIONS,
    expectedAnswer: COMPLIANCE_ACCEPTED,
    controlCode,
  };
}

export const soc2FullTemplate: TemplateSeed = {
  id: "full-soc-2",
  name: "SOC 2 Full",
  description:
    "Complete self-assessment questionnaire covering all 51 SOC 2 Trust Services Criteria across the common criteria and supplementary criteria.",
  frameworkName: "SOC 2",
  sections: [
    {
      title: "CC1 Control Environment",
      questions: [
        complianceQuestion(
          "Does your organization demonstrate a commitment to integrity and ethical values?",
          "CC1.1",
          "MEDIUM",
        ),
        complianceQuestion(
          "Does your board provide oversight of internal control that is independent of management?",
          "CC1.2",
          "MEDIUM",
        ),
        complianceQuestion(
          "Are structures, reporting lines, authorities, and responsibilities established?",
          "CC1.3",
          "MEDIUM",
        ),
        complianceQuestion(
          "Does your organization attract, develop, and retain competent personnel?",
          "CC1.4",
          "MEDIUM",
        ),
        complianceQuestion(
          "Are individuals held accountable for their internal control responsibilities?",
          "CC1.5",
          "HIGH",
        ),
      ],
    },
    {
      title: "CC2 Communication & Information",
      questions: [
        complianceQuestion(
          "Is relevant, quality information used to support the functioning of controls?",
          "CC2.1",
          "MEDIUM",
        ),
        complianceQuestion(
          "Are control objectives and responsibilities communicated internally?",
          "CC2.2",
          "MEDIUM",
        ),
        complianceQuestion(
          "Are matters affecting the functioning of controls communicated with external parties?",
          "CC2.3",
          "MEDIUM",
        ),
      ],
    },
    {
      title: "CC3 Risk Assessment",
      questions: [
        complianceQuestion(
          "Are objectives specified clearly enough to enable the assessment of related risks?",
          "CC3.1",
          "HIGH",
        ),
        complianceQuestion(
          "Are risks to achieving objectives identified and analysed?",
          "CC3.2",
          "HIGH",
        ),
        complianceQuestion(
          "Is the potential for fraud considered when evaluating risks?",
          "CC3.3",
          "HIGH",
        ),
        complianceQuestion(
          "Are changes that could significantly affect controls identified and assessed?",
          "CC3.4",
          "HIGH",
        ),
      ],
    },
    {
      title: "CC4 Monitoring Activities",
      questions: [
        complianceQuestion(
          "Are ongoing and/or separate evaluations of controls performed?",
          "CC4.1",
          "HIGH",
        ),
        complianceQuestion(
          "Are control deficiencies evaluated and communicated for remediation?",
          "CC4.2",
          "HIGH",
        ),
      ],
    },
    {
      title: "CC5 Control Activities",
      questions: [
        complianceQuestion(
          "Are control activities selected and developed to mitigate risks?",
          "CC5.1",
          "HIGH",
        ),
        complianceQuestion(
          "Are general control activities over technology developed?",
          "CC5.2",
          "HIGH",
        ),
        complianceQuestion(
          "Are controls deployed through policies and supporting procedures?",
          "CC5.3",
          "HIGH",
        ),
      ],
    },
    {
      title: "CC6 Logical & Physical Access",
      questions: [
        complianceQuestion(
          "Are logical access controls implemented to protect information assets?",
          "CC6.1",
          "CRITICAL",
        ),
        complianceQuestion(
          "Are users registered, authorized, and removed appropriately?",
          "CC6.2",
          "HIGH",
        ),
        complianceQuestion(
          "Is access granted based on roles and the principle of least privilege?",
          "CC6.3",
          "CRITICAL",
        ),
        complianceQuestion(
          "Is physical access to facilities and assets restricted?",
          "CC6.4",
          "HIGH",
        ),
        complianceQuestion(
          "Is data protected when assets are disposed of or reused?",
          "CC6.5",
          "HIGH",
        ),
        complianceQuestion(
          "Are system boundaries protected against external threats?",
          "CC6.6",
          "CRITICAL",
        ),
        complianceQuestion(
          "Is information protected during transmission and movement?",
          "CC6.7",
          "CRITICAL",
        ),
        complianceQuestion(
          "Is unauthorized or malicious software prevented and detected?",
          "CC6.8",
          "CRITICAL",
        ),
      ],
    },
    {
      title: "CC7 System Operations",
      questions: [
        complianceQuestion(
          "Are vulnerabilities and changes to configurations detected?",
          "CC7.1",
          "CRITICAL",
        ),
        complianceQuestion(
          "Are systems monitored for anomalies and security events?",
          "CC7.2",
          "CRITICAL",
        ),
        complianceQuestion(
          "Are security events evaluated to determine if they are incidents?",
          "CC7.3",
          "HIGH",
        ),
        complianceQuestion(
          "Does your organization respond to security incidents in accordance with a defined program?",
          "CC7.4",
          "CRITICAL",
        ),
        complianceQuestion(
          "Does your organization recover from incidents and restore operations?",
          "CC7.5",
          "CRITICAL",
        ),
      ],
    },
    {
      title: "CC8 Change Management",
      questions: [
        complianceQuestion(
          "Are system changes authorized, designed, tested, and approved?",
          "CC8.1",
          "HIGH",
        ),
      ],
    },
    {
      title: "CC9 Risk Mitigation",
      questions: [
        complianceQuestion(
          "Are risks arising from potential business disruptions mitigated?",
          "CC9.1",
          "HIGH",
        ),
        complianceQuestion(
          "Are risks from vendors and business partners assessed and managed?",
          "CC9.2",
          "HIGH",
        ),
      ],
    },
    {
      title: "Availability",
      questions: [
        complianceQuestion(
          "Is capacity managed to meet your availability commitments?",
          "A1.1",
          "HIGH",
        ),
        complianceQuestion(
          "Are environmental protections, backups, and recovery capabilities in place?",
          "A1.2",
          "CRITICAL",
        ),
        complianceQuestion(
          "Are recovery procedures tested to support your availability commitments?",
          "A1.3",
          "CRITICAL",
        ),
      ],
    },
    {
      title: "Confidentiality",
      questions: [
        complianceQuestion(
          "Is information designated as confidential identified and protected?",
          "C1.1",
          "CRITICAL",
        ),
        complianceQuestion(
          "Is confidential information securely disposed of when no longer needed?",
          "C1.2",
          "HIGH",
        ),
      ],
    },
    {
      title: "Processing Integrity",
      questions: [
        complianceQuestion(
          "Is quality information provided about your processing objectives?",
          "PI1.1",
          "MEDIUM",
        ),
        complianceQuestion(
          "Are system inputs complete and accurate?",
          "PI1.2",
          "HIGH",
        ),
        complianceQuestion(
          "Is processing complete, valid, accurate, and timely?",
          "PI1.3",
          "HIGH",
        ),
        complianceQuestion(
          "Are outputs accurate, complete, and delivered on time?",
          "PI1.4",
          "HIGH",
        ),
        complianceQuestion(
          "Are inputs and outputs stored completely and accurately?",
          "PI1.5",
          "HIGH",
        ),
      ],
    },
    {
      title: "Privacy",
      questions: [
        complianceQuestion(
          "Are privacy practices and commitments communicated to individuals?",
          "P1",
          "MEDIUM",
        ),
        complianceQuestion(
          "Is consent for personal information obtained and honoured?",
          "P2",
          "HIGH",
        ),
        complianceQuestion(
          "Is personal information collected consistently with stated objectives?",
          "P3",
          "HIGH",
        ),
        complianceQuestion(
          "Are use, retention, and disposal of personal information limited appropriately?",
          "P4",
          "HIGH",
        ),
        complianceQuestion(
          "Are data subjects able to access and correct their information?",
          "P5",
          "HIGH",
        ),
        complianceQuestion(
          "Is disclosure of personal information to third parties controlled?",
          "P6",
          "HIGH",
        ),
        complianceQuestion(
          "Is personal information maintained accurate, complete, and relevant?",
          "P7",
          "MEDIUM",
        ),
        complianceQuestion(
          "Is privacy compliance monitored and are complaints addressed?",
          "P8",
          "HIGH",
        ),
      ],
    },
  ],
};
