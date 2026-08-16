import { type TemplateSeed } from "../types";
import { frequencyQuestion, yesNoQuestion } from "./helpers";

export const iso27001FullTemplate: TemplateSeed = {
  id: "full-iso-27001",
  name: "ISO 27001 Full",
  description:
    "Complete self-assessment questionnaire covering all 93 ISO/IEC 27001:2022 Annex A controls across the four themes.",
  frameworkName: "ISO 27001",
  sections: [
    {
      title: "A.5 Organizational",
      questions: [
        yesNoQuestion(
          "Are information security policies defined, approved, published, and regularly reviewed?",
          "A.5.1",
          "HIGH",
        ),
        yesNoQuestion(
          "Are information security roles and responsibilities allocated and communicated across your organization?",
          "A.5.2",
          "HIGH",
        ),
        yesNoQuestion(
          "Are conflicting duties and responsibilities separated to reduce the risk of fraud or error?",
          "A.5.3",
          "HIGH",
        ),
        yesNoQuestion(
          "Does management require staff to apply information security in accordance with policies and procedures?",
          "A.5.4",
          "HIGH",
        ),
        yesNoQuestion(
          "Are procedures maintained for contacting relevant authorities when required?",
          "A.5.5",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Does your organization engage with security forums and professional groups to stay informed?",
          "A.5.6",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Is threat information collected and analysed to inform protective action?",
          "A.5.7",
          "HIGH",
        ),
        yesNoQuestion(
          "Are information security requirements integrated into project management activities?",
          "A.5.8",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Is an accurate inventory of information and associated assets maintained with assigned owners?",
          "A.5.9",
          "HIGH",
        ),
        yesNoQuestion(
          "Are acceptable-use rules for information and other assets defined and enforced?",
          "A.5.10",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Are assets returned upon termination or change of employment or contracts?",
          "A.5.11",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Is information classified according to its sensitivity and business value?",
          "A.5.12",
          "HIGH",
        ),
        yesNoQuestion(
          "Is information labelled consistently with your classification scheme?",
          "A.5.13",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Is information protected when transferred within and outside your organization?",
          "A.5.14",
          "HIGH",
        ),
        yesNoQuestion(
          "Are access-control rules established based on business and information security requirements?",
          "A.5.15",
          "CRITICAL",
        ),
        yesNoQuestion(
          "Is the full lifecycle of identities managed and controlled?",
          "A.5.16",
          "CRITICAL",
        ),
        yesNoQuestion(
          "Is the allocation and handling of passwords and other authentication secrets controlled?",
          "A.5.17",
          "CRITICAL",
        ),
        frequencyQuestion(
          "How often are user access rights reviewed and updated?",
          "A.5.18",
          "CRITICAL",
          ["Monthly", "Quarterly", "Half-yearly", "Annually", "Never"],
          ["Monthly", "Quarterly", "Half-yearly"],
        ),
        yesNoQuestion(
          "Are information security risks from supplier access to your assets managed?",
          "A.5.19",
          "HIGH",
        ),
        yesNoQuestion(
          "Are information security requirements included in supplier agreements?",
          "A.5.20",
          "HIGH",
        ),
        yesNoQuestion(
          "Are information security risks addressed across your ICT supply chain?",
          "A.5.21",
          "HIGH",
        ),
        yesNoQuestion(
          "Are supplier service delivery and changes monitored and reviewed?",
          "A.5.22",
          "HIGH",
        ),
        yesNoQuestion(
          "Are security requirements defined for acquiring, using, and exiting cloud services?",
          "A.5.23",
          "HIGH",
        ),
        yesNoQuestion(
          "Are incident management roles, responsibilities, and processes planned and prepared?",
          "A.5.24",
          "CRITICAL",
        ),
        yesNoQuestion(
          "Are information security events assessed to decide whether they constitute incidents?",
          "A.5.25",
          "HIGH",
        ),
        yesNoQuestion(
          "Are information security incidents responded to in accordance with documented procedures?",
          "A.5.26",
          "CRITICAL",
        ),
        yesNoQuestion(
          "Are lessons learned from incidents used to strengthen security controls?",
          "A.5.27",
          "HIGH",
        ),
        yesNoQuestion(
          "Is evidence identified, collected, and preserved appropriately for legal or disciplinary proceedings?",
          "A.5.28",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Is information security maintained during disruption and recovery?",
          "A.5.29",
          "HIGH",
        ),
        yesNoQuestion(
          "Is ICT readiness planned to meet business continuity objectives?",
          "A.5.30",
          "HIGH",
        ),
        yesNoQuestion(
          "Are legal, statutory, regulatory, and contractual requirements identified and met?",
          "A.5.31",
          "HIGH",
        ),
        yesNoQuestion(
          "Are intellectual property rights and licensed materials protected?",
          "A.5.32",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Are records protected from loss, falsification, and unauthorized access?",
          "A.5.33",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Is personally identifiable information protected in accordance with privacy requirements?",
          "A.5.34",
          "HIGH",
        ),
        yesNoQuestion(
          "Is the information security programme reviewed independently at planned intervals?",
          "A.5.35",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Is ongoing compliance with information security policies and standards verified?",
          "A.5.36",
          "HIGH",
        ),
        yesNoQuestion(
          "Are operating procedures documented and made available to those who need them?",
          "A.5.37",
          "MEDIUM",
        ),
      ],
    },
    {
      title: "A.6 People",
      questions: [
        yesNoQuestion(
          "Are background verification checks performed proportionate to role and risk?",
          "A.6.1",
          "HIGH",
        ),
        yesNoQuestion(
          "Do employment terms and conditions state information security responsibilities?",
          "A.6.2",
          "HIGH",
        ),
        frequencyQuestion(
          "How often is information security awareness, education, and training provided?",
          "A.6.3",
          "HIGH",
          ["Ongoing", "Annually", "On hire only", "Never"],
          ["Ongoing", "Annually"],
        ),
        yesNoQuestion(
          "Is a formal disciplinary process operated for information security policy violations?",
          "A.6.4",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Are information security duties enforced after termination or change of employment?",
          "A.6.5",
          "HIGH",
        ),
        yesNoQuestion(
          "Are confidentiality or non-disclosure agreements used to protect information?",
          "A.6.6",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Are safeguards applied for information accessed while working remotely?",
          "A.6.7",
          "HIGH",
        ),
        yesNoQuestion(
          "Is a channel provided for promptly reporting information security events?",
          "A.6.8",
          "HIGH",
        ),
      ],
    },
    {
      title: "A.7 Physical",
      questions: [
        yesNoQuestion(
          "Are secure physical security perimeters defined and protected?",
          "A.7.1",
          "HIGH",
        ),
        yesNoQuestion(
          "Is entry to secure areas controlled with appropriate measures?",
          "A.7.2",
          "HIGH",
        ),
        yesNoQuestion(
          "Is physical security designed and applied for offices, rooms, and facilities?",
          "A.7.3",
          "HIGH",
        ),
        yesNoQuestion(
          "Are premises monitored for unauthorized physical access?",
          "A.7.4",
          "HIGH",
        ),
        yesNoQuestion(
          "Are assets protected against fire, flood, and other physical and environmental threats?",
          "A.7.5",
          "HIGH",
        ),
        yesNoQuestion(
          "Are rules applied for working within secure areas?",
          "A.7.6",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Are clear-desk and clear-screen practices enforced?",
          "A.7.7",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Is equipment sited and protected to reduce risks?",
          "A.7.8",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Are assets used outside your premises protected?",
          "A.7.9",
          "HIGH",
        ),
        yesNoQuestion(
          "Is storage media managed securely through its lifecycle?",
          "A.7.10",
          "HIGH",
        ),
        yesNoQuestion(
          "Is equipment protected from failures of supporting utilities?",
          "A.7.11",
          "HIGH",
        ),
        yesNoQuestion(
          "Is power and network cabling protected from interception or damage?",
          "A.7.12",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Is equipment maintained to ensure availability and integrity?",
          "A.7.13",
          "HIGH",
        ),
        yesNoQuestion(
          "Is data securely erased before equipment disposal or reuse?",
          "A.7.14",
          "HIGH",
        ),
      ],
    },
    {
      title: "A.8 Technological",
      questions: [
        yesNoQuestion(
          "Is information stored on or accessed by endpoint devices protected?",
          "A.8.1",
          "HIGH",
        ),
        yesNoQuestion(
          "Are privileged access rights restricted and managed?",
          "A.8.2",
          "CRITICAL",
        ),
        yesNoQuestion(
          "Is access to information restricted in accordance with your access-control policy?",
          "A.8.3",
          "HIGH",
        ),
        yesNoQuestion(
          "Is read and write access to source code controlled?",
          "A.8.4",
          "HIGH",
        ),
        yesNoQuestion(
          "Is strong authentication, including multi-factor authentication where appropriate, implemented?",
          "A.8.5",
          "CRITICAL",
        ),
        yesNoQuestion(
          "Is resource capacity monitored and tuned to meet demand?",
          "A.8.6",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Is malware protection deployed and supported by user awareness?",
          "A.8.7",
          "CRITICAL",
        ),
        frequencyQuestion(
          "How often are technical vulnerabilities identified and remediated?",
          "A.8.8",
          "HIGH",
          ["Continuous", "Weekly", "Monthly", "Quarterly", "Annually", "Never"],
          ["Continuous", "Weekly", "Monthly"],
        ),
        yesNoQuestion(
          "Are secure configurations established and maintained?",
          "A.8.9",
          "HIGH",
        ),
        yesNoQuestion(
          "Is information deleted when no longer required?",
          "A.8.10",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Is data masking used to limit exposure of sensitive values?",
          "A.8.11",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Are measures applied to prevent data leakage?",
          "A.8.12",
          "CRITICAL",
        ),
        frequencyQuestion(
          "How often are backups tested for restorability?",
          "A.8.13",
          "CRITICAL",
          ["Monthly", "Quarterly", "Annually", "Never"],
          ["Monthly", "Quarterly"],
        ),
        yesNoQuestion(
          "Is redundancy provided for information processing facilities to meet availability requirements?",
          "A.8.14",
          "HIGH",
        ),
        yesNoQuestion(
          "Are logs of relevant events produced, stored, and protected?",
          "A.8.15",
          "CRITICAL",
        ),
        yesNoQuestion(
          "Are systems and networks monitored for anomalous behaviour?",
          "A.8.16",
          "CRITICAL",
        ),
        yesNoQuestion(
          "Are system clocks synchronized to a reliable time source?",
          "A.8.17",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Is the use of privileged utility programs restricted and monitored?",
          "A.8.18",
          "HIGH",
        ),
        yesNoQuestion(
          "Is the installation of software on production systems controlled?",
          "A.8.19",
          "HIGH",
        ),
        yesNoQuestion(
          "Are networks secured and managed to protect information?",
          "A.8.20",
          "CRITICAL",
        ),
        yesNoQuestion(
          "Are security mechanisms and service levels for network services defined and monitored?",
          "A.8.21",
          "HIGH",
        ),
        yesNoQuestion(
          "Are networks segregated by trust level and function?",
          "A.8.22",
          "CRITICAL",
        ),
        yesNoQuestion(
          "Is access to external websites filtered to reduce risk?",
          "A.8.23",
          "HIGH",
        ),
        yesNoQuestion(
          "Is cryptography applied and keys managed in accordance with policy?",
          "A.8.24",
          "HIGH",
        ),
        yesNoQuestion(
          "Is security applied throughout the software development lifecycle?",
          "A.8.25",
          "HIGH",
        ),
        yesNoQuestion(
          "Are application security requirements defined and verified?",
          "A.8.26",
          "HIGH",
        ),
        yesNoQuestion(
          "Are secure-by-design engineering principles applied to system architecture?",
          "A.8.27",
          "HIGH",
        ),
        yesNoQuestion(
          "Are secure coding standards and code reviews followed?",
          "A.8.28",
          "HIGH",
        ),
        yesNoQuestion(
          "Is security testing performed during development and acceptance?",
          "A.8.29",
          "HIGH",
        ),
        yesNoQuestion(
          "Is the security of outsourced development governed and assured?",
          "A.8.30",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Are development, test, and production environments separated?",
          "A.8.31",
          "HIGH",
        ),
        yesNoQuestion(
          "Are changes to information processing facilities controlled?",
          "A.8.32",
          "HIGH",
        ),
        yesNoQuestion(
          "Is information used for testing protected and controlled?",
          "A.8.33",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Are audit tests planned to minimize impact on operational systems?",
          "A.8.34",
          "MEDIUM",
        ),
      ],
    },
  ],
};
