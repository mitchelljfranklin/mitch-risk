import { type FrameworkSeed } from "./types";

const ORGANIZATIONAL = "A.5 Organizational";
const PEOPLE = "A.6 People";
const PHYSICAL = "A.7 Physical";
const TECHNOLOGICAL = "A.8 Technological";

export const iso27001: FrameworkSeed = {
  name: "ISO 27001",
  version: "2022",
  description:
    "ISO/IEC 27001:2022 Annex A information security controls (codes and titles with mitch-risk guidance).",
  controls: [
    {
      domain: ORGANIZATIONAL,
      code: "A.5.1",
      title: "Policies for information security",
      guidance:
        "Define, approve, publish, and regularly review information security policies.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.2",
      title: "Information security roles and responsibilities",
      guidance:
        "Allocate and communicate clear security responsibilities across the organization.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.3",
      title: "Segregation of duties",
      guidance:
        "Separate conflicting duties to reduce the risk of fraud or error.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.4",
      title: "Management responsibilities",
      guidance: "Require management to ensure staff apply security per policy.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.5",
      title: "Contact with authorities",
      guidance:
        "Maintain procedures for contacting relevant authorities when needed.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.6",
      title: "Contact with special interest groups",
      guidance:
        "Engage security forums and professional groups to stay informed.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.7",
      title: "Threat intelligence",
      guidance:
        "Collect and analyse threat information to inform protective action.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.8",
      title: "Information security in project management",
      guidance: "Integrate security requirements into all project activities.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.9",
      title: "Inventory of information and other associated assets",
      guidance:
        "Maintain an accurate inventory of information and assets with owners.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.10",
      title: "Acceptable use of information and other associated assets",
      guidance: "Define and enforce acceptable-use rules for assets.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.11",
      title: "Return of assets",
      guidance: "Ensure assets are returned on termination or change of role.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.12",
      title: "Classification of information",
      guidance: "Classify information by sensitivity and business value.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.13",
      title: "Labelling of information",
      guidance: "Apply labels consistent with the classification scheme.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.14",
      title: "Information transfer",
      guidance: "Protect information transferred internally and externally.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.15",
      title: "Access control",
      guidance:
        "Establish access-control rules based on business and security needs.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.16",
      title: "Identity management",
      guidance: "Manage the full lifecycle of identities.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.17",
      title: "Authentication information",
      guidance:
        "Control allocation and handling of passwords and other secrets.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.18",
      title: "Access rights",
      guidance: "Provision, review, and revoke access rights per policy.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.19",
      title: "Information security in supplier relationships",
      guidance: "Manage security risks from supplier access to assets.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.20",
      title: "Addressing information security within supplier agreements",
      guidance: "Include security requirements in supplier agreements.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.21",
      title: "Managing information security in the ICT supply chain",
      guidance: "Address security risks across the ICT supply chain.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.22",
      title: "Monitoring, review and change management of supplier services",
      guidance: "Monitor and review supplier service delivery and changes.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.23",
      title: "Information security for use of cloud services",
      guidance:
        "Set requirements for acquiring, using, and exiting cloud services.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.24",
      title:
        "Information security incident management planning and preparation",
      guidance: "Plan and prepare incident management roles and processes.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.25",
      title: "Assessment and decision on information security events",
      guidance: "Assess events and decide whether they are incidents.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.26",
      title: "Response to information security incidents",
      guidance: "Respond to incidents per documented procedures.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.27",
      title: "Learning from information security incidents",
      guidance: "Use lessons learned to strengthen controls.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.28",
      title: "Collection of evidence",
      guidance: "Identify, collect, and preserve evidence appropriately.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.29",
      title: "Information security during disruption",
      guidance: "Maintain security during disruption and recovery.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.30",
      title: "ICT readiness for business continuity",
      guidance: "Plan ICT readiness to meet continuity objectives.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.31",
      title: "Legal, statutory, regulatory and contractual requirements",
      guidance:
        "Identify and meet applicable legal and contractual obligations.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.32",
      title: "Intellectual property rights",
      guidance: "Protect intellectual property and licensed materials.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.33",
      title: "Protection of records",
      guidance:
        "Protect records from loss, falsification, and unauthorized access.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.34",
      title: "Privacy and protection of personal identifiable information",
      guidance: "Protect personal data per applicable privacy requirements.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.35",
      title: "Independent review of information security",
      guidance:
        "Review the security programme independently at planned intervals.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.36",
      title:
        "Compliance with policies, rules and standards for information security",
      guidance:
        "Verify ongoing compliance with security policies and standards.",
    },
    {
      domain: ORGANIZATIONAL,
      code: "A.5.37",
      title: "Documented operating procedures",
      guidance: "Document and make operating procedures available.",
    },

    {
      domain: PEOPLE,
      code: "A.6.1",
      title: "Screening",
      guidance:
        "Perform background verification proportionate to role and risk.",
    },
    {
      domain: PEOPLE,
      code: "A.6.2",
      title: "Terms and conditions of employment",
      guidance: "State security responsibilities in employment terms.",
    },
    {
      domain: PEOPLE,
      code: "A.6.3",
      title: "Information security awareness, education and training",
      guidance: "Provide ongoing security awareness and training.",
    },
    {
      domain: PEOPLE,
      code: "A.6.4",
      title: "Disciplinary process",
      guidance: "Operate a formal process for security policy violations.",
    },
    {
      domain: PEOPLE,
      code: "A.6.5",
      title: "Responsibilities after termination or change of employment",
      guidance: "Define and enforce post-employment security duties.",
    },
    {
      domain: PEOPLE,
      code: "A.6.6",
      title: "Confidentiality or non-disclosure agreements",
      guidance: "Use NDAs to protect confidential information.",
    },
    {
      domain: PEOPLE,
      code: "A.6.7",
      title: "Remote working",
      guidance:
        "Apply safeguards for information accessed while working remotely.",
    },
    {
      domain: PEOPLE,
      code: "A.6.8",
      title: "Information security event reporting",
      guidance: "Provide a channel to report security events promptly.",
    },

    {
      domain: PHYSICAL,
      code: "A.7.1",
      title: "Physical security perimeters",
      guidance: "Define and protect secure physical perimeters.",
    },
    {
      domain: PHYSICAL,
      code: "A.7.2",
      title: "Physical entry",
      guidance: "Control entry to secure areas with appropriate measures.",
    },
    {
      domain: PHYSICAL,
      code: "A.7.3",
      title: "Securing offices, rooms and facilities",
      guidance: "Design and apply physical security for facilities.",
    },
    {
      domain: PHYSICAL,
      code: "A.7.4",
      title: "Physical security monitoring",
      guidance: "Monitor premises for unauthorized physical access.",
    },
    {
      domain: PHYSICAL,
      code: "A.7.5",
      title: "Protecting against physical and environmental threats",
      guidance: "Protect against fire, flood, and other environmental threats.",
    },
    {
      domain: PHYSICAL,
      code: "A.7.6",
      title: "Working in secure areas",
      guidance: "Apply rules for working within secure areas.",
    },
    {
      domain: PHYSICAL,
      code: "A.7.7",
      title: "Clear desk and clear screen",
      guidance: "Enforce clear-desk and clear-screen practices.",
    },
    {
      domain: PHYSICAL,
      code: "A.7.8",
      title: "Equipment siting and protection",
      guidance: "Site and protect equipment to reduce risks.",
    },
    {
      domain: PHYSICAL,
      code: "A.7.9",
      title: "Security of assets off-premises",
      guidance: "Protect assets used outside the organization's premises.",
    },
    {
      domain: PHYSICAL,
      code: "A.7.10",
      title: "Storage media",
      guidance: "Manage storage media securely through its lifecycle.",
    },
    {
      domain: PHYSICAL,
      code: "A.7.11",
      title: "Supporting utilities",
      guidance: "Protect equipment from supporting-utility failures.",
    },
    {
      domain: PHYSICAL,
      code: "A.7.12",
      title: "Cabling security",
      guidance:
        "Protect power and network cabling from interception or damage.",
    },
    {
      domain: PHYSICAL,
      code: "A.7.13",
      title: "Equipment maintenance",
      guidance: "Maintain equipment to ensure availability and integrity.",
    },
    {
      domain: PHYSICAL,
      code: "A.7.14",
      title: "Secure disposal or re-use of equipment",
      guidance: "Securely erase data before equipment disposal or reuse.",
    },

    {
      domain: TECHNOLOGICAL,
      code: "A.8.1",
      title: "User endpoint devices",
      guidance:
        "Protect information stored on or accessed by endpoint devices.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.2",
      title: "Privileged access rights",
      guidance: "Restrict and manage privileged access rights.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.3",
      title: "Information access restriction",
      guidance: "Restrict access to information per access-control policy.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.4",
      title: "Access to source code",
      guidance: "Control read and write access to source code.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.5",
      title: "Secure authentication",
      guidance:
        "Implement strong authentication, including MFA where appropriate.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.6",
      title: "Capacity management",
      guidance: "Monitor and tune resource capacity to meet demand.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.7",
      title: "Protection against malware",
      guidance: "Deploy malware protection supported by user awareness.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.8",
      title: "Management of technical vulnerabilities",
      guidance: "Identify, assess, and remediate technical vulnerabilities.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.9",
      title: "Configuration management",
      guidance: "Establish and maintain secure configurations.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.10",
      title: "Information deletion",
      guidance: "Delete information when it is no longer required.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.11",
      title: "Data masking",
      guidance: "Mask data to limit exposure of sensitive values.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.12",
      title: "Data leakage prevention",
      guidance: "Apply measures to prevent data leakage.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.13",
      title: "Information backup",
      guidance: "Back up information and test restoration regularly.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.14",
      title: "Redundancy of information processing facilities",
      guidance: "Provide redundancy to meet availability requirements.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.15",
      title: "Logging",
      guidance: "Produce, store, and protect logs of relevant events.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.16",
      title: "Monitoring activities",
      guidance: "Monitor systems and networks for anomalous behaviour.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.17",
      title: "Clock synchronization",
      guidance: "Synchronize clocks to a reliable time source.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.18",
      title: "Use of privileged utility programs",
      guidance: "Restrict and monitor privileged utility programs.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.19",
      title: "Installation of software on operational systems",
      guidance: "Control installation of software on production systems.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.20",
      title: "Networks security",
      guidance: "Secure and manage networks to protect information.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.21",
      title: "Security of network services",
      guidance: "Define and monitor the security of network services.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.22",
      title: "Segregation of networks",
      guidance: "Segregate networks by trust level and function.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.23",
      title: "Web filtering",
      guidance: "Filter access to external websites to reduce risk.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.24",
      title: "Use of cryptography",
      guidance: "Apply cryptography and manage keys per policy.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.25",
      title: "Secure development life cycle",
      guidance: "Apply security throughout the development lifecycle.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.26",
      title: "Application security requirements",
      guidance: "Define and verify application security requirements.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.27",
      title: "Secure system architecture and engineering principles",
      guidance: "Apply secure-by-design engineering principles.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.28",
      title: "Secure coding",
      guidance: "Follow secure coding standards and reviews.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.29",
      title: "Security testing in development and acceptance",
      guidance: "Test security during development and acceptance.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.30",
      title: "Outsourced development",
      guidance: "Govern and assure the security of outsourced development.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.31",
      title: "Separation of development, test and production environments",
      guidance: "Separate development, test, and production environments.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.32",
      title: "Change management",
      guidance: "Control changes to information processing facilities.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.33",
      title: "Test information",
      guidance: "Protect and control information used for testing.",
    },
    {
      domain: TECHNOLOGICAL,
      code: "A.8.34",
      title: "Protection of information systems during audit testing",
      guidance: "Plan audit tests to minimize impact on systems.",
    },
  ],
};
