import { type FrameworkSeed } from "./types";

const CC1 = "CC1 Control Environment";
const CC2 = "CC2 Communication & Information";
const CC3 = "CC3 Risk Assessment";
const CC4 = "CC4 Monitoring Activities";
const CC5 = "CC5 Control Activities";
const CC6 = "CC6 Logical & Physical Access";
const CC7 = "CC7 System Operations";
const CC8 = "CC8 Change Management";
const CC9 = "CC9 Risk Mitigation";
const AVAILABILITY = "Availability";
const CONFIDENTIALITY = "Confidentiality";
const PROCESSING_INTEGRITY = "Processing Integrity";
const PRIVACY = "Privacy";

export const soc2: FrameworkSeed = {
  name: "SOC 2",
  version: "2017 TSC (rev. 2022)",
  description:
    "SOC 2 Trust Services Criteria (paraphrased criterion titles with mitch-risk guidance).",
  controls: [
    {
      domain: CC1,
      code: "CC1.1",
      title: "Commitment to integrity and ethical values",
      guidance:
        "Demonstrate an organizational commitment to integrity and ethics.",
    },
    {
      domain: CC1,
      code: "CC1.2",
      title: "Board oversight of internal control",
      guidance:
        "Provide governance oversight that is independent of management.",
    },
    {
      domain: CC1,
      code: "CC1.3",
      title: "Structures, reporting lines, and authority",
      guidance:
        "Establish structures, reporting lines, authorities, and responsibilities.",
    },
    {
      domain: CC1,
      code: "CC1.4",
      title: "Commitment to competence",
      guidance: "Attract, develop, and retain competent people.",
    },
    {
      domain: CC1,
      code: "CC1.5",
      title: "Accountability for responsibilities",
      guidance: "Hold individuals accountable for their control duties.",
    },
    {
      domain: CC2,
      code: "CC2.1",
      title: "Quality information for internal control",
      guidance: "Use relevant, quality information to support controls.",
    },
    {
      domain: CC2,
      code: "CC2.2",
      title: "Internal communication of objectives and duties",
      guidance:
        "Communicate control objectives and responsibilities internally.",
    },
    {
      domain: CC2,
      code: "CC2.3",
      title: "External communication on relevant matters",
      guidance:
        "Communicate with external parties on matters affecting controls.",
    },
    {
      domain: CC3,
      code: "CC3.1",
      title: "Objectives defined to enable risk assessment",
      guidance: "Specify objectives clearly enough to assess related risks.",
    },
    {
      domain: CC3,
      code: "CC3.2",
      title: "Identification and analysis of risk",
      guidance: "Identify and analyse risks to achieving objectives.",
    },
    {
      domain: CC3,
      code: "CC3.3",
      title: "Consideration of fraud risk",
      guidance: "Assess the potential for fraud when evaluating risks.",
    },
    {
      domain: CC3,
      code: "CC3.4",
      title: "Assessment of significant change",
      guidance: "Identify and assess changes that could affect controls.",
    },
    {
      domain: CC4,
      code: "CC4.1",
      title: "Ongoing and separate evaluations",
      guidance: "Perform ongoing and/or separate evaluations of controls.",
    },
    {
      domain: CC4,
      code: "CC4.2",
      title: "Evaluation and communication of deficiencies",
      guidance:
        "Evaluate and communicate control deficiencies for remediation.",
    },
    {
      domain: CC5,
      code: "CC5.1",
      title: "Control activities that mitigate risk",
      guidance: "Select and develop control activities that mitigate risks.",
    },
    {
      domain: CC5,
      code: "CC5.2",
      title: "General controls over technology",
      guidance: "Develop general control activities over technology.",
    },
    {
      domain: CC5,
      code: "CC5.3",
      title: "Controls deployed through policy and procedure",
      guidance: "Deploy controls through policies and supporting procedures.",
    },
    {
      domain: CC6,
      code: "CC6.1",
      title: "Logical access security controls",
      guidance: "Restrict logical access to protect information assets.",
    },
    {
      domain: CC6,
      code: "CC6.2",
      title: "Registration and authorization of users",
      guidance: "Register, authorize, and remove user access appropriately.",
    },
    {
      domain: CC6,
      code: "CC6.3",
      title: "Role-based access and least privilege",
      guidance: "Grant access based on roles and least privilege.",
    },
    {
      domain: CC6,
      code: "CC6.4",
      title: "Restriction of physical access",
      guidance: "Restrict physical access to facilities and assets.",
    },
    {
      domain: CC6,
      code: "CC6.5",
      title: "Protection when disposing of assets",
      guidance: "Protect data when assets are disposed of or reused.",
    },
    {
      domain: CC6,
      code: "CC6.6",
      title: "Protection against external threats",
      guidance: "Protect system boundaries against external threats.",
    },
    {
      domain: CC6,
      code: "CC6.7",
      title: "Protection of information in transit and movement",
      guidance: "Protect information during transmission and movement.",
    },
    {
      domain: CC6,
      code: "CC6.8",
      title: "Prevention and detection of unauthorized software",
      guidance: "Prevent and detect unauthorized or malicious software.",
    },
    {
      domain: CC7,
      code: "CC7.1",
      title: "Detection of vulnerabilities and misconfigurations",
      guidance: "Detect vulnerabilities and changes to configurations.",
    },
    {
      domain: CC7,
      code: "CC7.2",
      title: "Monitoring for anomalies and security events",
      guidance: "Monitor systems for anomalies and security events.",
    },
    {
      domain: CC7,
      code: "CC7.3",
      title: "Evaluation of security events",
      guidance: "Evaluate security events to determine if they are incidents.",
    },
    {
      domain: CC7,
      code: "CC7.4",
      title: "Incident response program",
      guidance:
        "Respond to identified security incidents per a defined program.",
    },
    {
      domain: CC7,
      code: "CC7.5",
      title: "Recovery from incidents",
      guidance: "Recover from security incidents and restore operations.",
    },
    {
      domain: CC8,
      code: "CC8.1",
      title: "Authorized, designed, and tested changes",
      guidance: "Authorize, design, test, and approve system changes.",
    },
    {
      domain: CC9,
      code: "CC9.1",
      title: "Risk mitigation for business disruptions",
      guidance: "Mitigate risks arising from potential business disruptions.",
    },
    {
      domain: CC9,
      code: "CC9.2",
      title: "Management of vendor and partner risk",
      guidance: "Assess and manage risks from vendors and business partners.",
    },
    {
      domain: AVAILABILITY,
      code: "A1.1",
      title: "Capacity to meet availability commitments",
      guidance: "Manage capacity to meet availability commitments.",
    },
    {
      domain: AVAILABILITY,
      code: "A1.2",
      title: "Environmental protection, backup, and recovery",
      guidance: "Protect the environment and provide backup and recovery.",
    },
    {
      domain: AVAILABILITY,
      code: "A1.3",
      title: "Recovery plan testing",
      guidance: "Test recovery procedures to support availability commitments.",
    },
    {
      domain: CONFIDENTIALITY,
      code: "C1.1",
      title: "Identification and protection of confidential information",
      guidance: "Identify and protect information designated confidential.",
    },
    {
      domain: CONFIDENTIALITY,
      code: "C1.2",
      title: "Disposal of confidential information",
      guidance:
        "Dispose of confidential information securely when no longer needed.",
    },
    {
      domain: PROCESSING_INTEGRITY,
      code: "PI1.1",
      title: "Quality information about processing",
      guidance: "Provide quality information about processing objectives.",
    },
    {
      domain: PROCESSING_INTEGRITY,
      code: "PI1.2",
      title: "Complete and accurate inputs",
      guidance: "Ensure system inputs are complete and accurate.",
    },
    {
      domain: PROCESSING_INTEGRITY,
      code: "PI1.3",
      title: "Complete and accurate processing",
      guidance: "Ensure processing is complete, valid, accurate, and timely.",
    },
    {
      domain: PROCESSING_INTEGRITY,
      code: "PI1.4",
      title: "Accurate and timely outputs",
      guidance: "Ensure outputs are accurate, complete, and delivered on time.",
    },
    {
      domain: PROCESSING_INTEGRITY,
      code: "PI1.5",
      title: "Storage integrity",
      guidance: "Store inputs and outputs completely and accurately.",
    },
    {
      domain: PRIVACY,
      code: "P1",
      title: "Notice and communication of privacy practices",
      guidance: "Provide notice about privacy practices and commitments.",
    },
    {
      domain: PRIVACY,
      code: "P2",
      title: "Choice and consent",
      guidance: "Obtain and honour consent for personal information.",
    },
    {
      domain: PRIVACY,
      code: "P3",
      title: "Collection",
      guidance:
        "Collect personal information consistent with stated objectives.",
    },
    {
      domain: PRIVACY,
      code: "P4",
      title: "Use, retention, and disposal",
      guidance: "Limit use, retention, and disposal of personal information.",
    },
    {
      domain: PRIVACY,
      code: "P5",
      title: "Access",
      guidance: "Allow data subjects to access and correct their information.",
    },
    {
      domain: PRIVACY,
      code: "P6",
      title: "Disclosure to third parties",
      guidance: "Control disclosure of personal information to third parties.",
    },
    {
      domain: PRIVACY,
      code: "P7",
      title: "Quality",
      guidance:
        "Maintain accurate, complete, and relevant personal information.",
    },
    {
      domain: PRIVACY,
      code: "P8",
      title: "Monitoring and enforcement",
      guidance: "Monitor privacy compliance and address complaints.",
    },
  ],
};
