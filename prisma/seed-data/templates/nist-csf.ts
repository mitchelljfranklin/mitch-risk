import type { RiskWeight } from "../../generated/prisma/client";
import { type TemplateQuestionSeed, type TemplateSeed } from "../types";

const STATUS_OPTIONS = [
  "Not Implemented",
  "Partially Implemented",
  "Largely Implemented",
  "Fully Implemented",
];

const STATUS_ACCEPTED = ["Largely Implemented", "Fully Implemented"];

function statusQuestion(
  text: string,
  controlCode: string,
  riskWeight: RiskWeight,
): TemplateQuestionSeed {
  return {
    text,
    type: "MULTIPLE_CHOICE",
    riskWeight,
    options: STATUS_OPTIONS,
    expectedAnswer: STATUS_ACCEPTED,
    controlCode,
  };
}

export const nistCsfFullTemplate: TemplateSeed = {
  id: "full-nist-csf",
  name: "NIST CSF 2.0 Full",
  description:
    "Complete self-assessment questionnaire covering all 129 NIST CSF 2.0 subcategories across the six functions.",
  frameworkName: "NIST CSF",
  sections: [
    {
      title: "Govern (GV)",
      questions: [
        statusQuestion(
          "Are your organization's mission and stakeholder expectations understood and documented?",
          "GV.OC-01",
          "MEDIUM",
        ),
        statusQuestion(
          "Are internal and external dependencies critical to your organization identified and communicated?",
          "GV.OC-02",
          "MEDIUM",
        ),
        statusQuestion(
          "Are legal, regulatory, and contractual cybersecurity requirements understood and managed?",
          "GV.OC-03",
          "HIGH",
        ),
        statusQuestion(
          "Are cybersecurity-critical objectives, capabilities, and services communicated across your organization?",
          "GV.OC-04",
          "MEDIUM",
        ),
        statusQuestion(
          "Are outcomes, capabilities, and services prioritized based on criticality to your mission?",
          "GV.OC-05",
          "MEDIUM",
        ),
        statusQuestion(
          "Are cybersecurity risk management objectives established and agreed to by stakeholders?",
          "GV.RM-01",
          "HIGH",
        ),
        statusQuestion(
          "Are risk appetite and tolerance statements established and communicated?",
          "GV.RM-02",
          "HIGH",
        ),
        statusQuestion(
          "Is cybersecurity risk management integrated into your enterprise risk management?",
          "GV.RM-03",
          "HIGH",
        ),
        statusQuestion(
          "Is strategic direction for cybersecurity risk established and communicated?",
          "GV.RM-04",
          "HIGH",
        ),
        statusQuestion(
          "Are lines of communication for cybersecurity risk established across your organization?",
          "GV.RM-05",
          "HIGH",
        ),
        statusQuestion(
          "Is a standardized method used to calculate, prioritize, and communicate cybersecurity risk?",
          "GV.RM-06",
          "HIGH",
        ),
        statusQuestion(
          "Are strategic opportunities informed by your organization's cybersecurity risk posture?",
          "GV.RM-07",
          "HIGH",
        ),
        statusQuestion(
          "Are cybersecurity leadership roles established and aligned with business strategy?",
          "GV.RR-01",
          "MEDIUM",
        ),
        statusQuestion(
          "Are cybersecurity roles and responsibilities established, communicated, and maintained?",
          "GV.RR-02",
          "MEDIUM",
        ),
        statusQuestion(
          "Are adequate financial, personnel, and technology resources allocated to manage cybersecurity risk?",
          "GV.RR-03",
          "HIGH",
        ),
        statusQuestion(
          "Are cybersecurity requirements included in human resources practices such as hiring and termination?",
          "GV.RR-04",
          "MEDIUM",
        ),
        statusQuestion(
          "Are cybersecurity policies established, communicated, and enforced?",
          "GV.PO-01",
          "HIGH",
        ),
        statusQuestion(
          "Are cybersecurity policies reviewed and updated at defined intervals and after significant events?",
          "GV.PO-02",
          "HIGH",
        ),
        statusQuestion(
          "Are cybersecurity processes and procedures established, communicated, and maintained?",
          "GV.PO-03",
          "HIGH",
        ),
        statusQuestion(
          "Are cybersecurity risk management outcomes reviewed to inform continuous improvement?",
          "GV.OV-01",
          "MEDIUM",
        ),
        statusQuestion(
          "Is your cybersecurity risk management program periodically reviewed?",
          "GV.OV-02",
          "MEDIUM",
        ),
        statusQuestion(
          "Is performance against cybersecurity objectives evaluated and reported to management?",
          "GV.OV-03",
          "MEDIUM",
        ),
        statusQuestion(
          "Is a cybersecurity supply chain risk management program established for suppliers and third parties?",
          "GV.SC-01",
          "HIGH",
        ),
        statusQuestion(
          "Are cybersecurity requirements included in supplier agreements and contracts?",
          "GV.SC-02",
          "HIGH",
        ),
        statusQuestion(
          "Is supply chain risk assessed and managed during acquisition and procurement?",
          "GV.SC-03",
          "HIGH",
        ),
        statusQuestion(
          "Are suppliers assessed against your cybersecurity requirements on a regular basis?",
          "GV.SC-04",
          "HIGH",
        ),
        statusQuestion(
          "Is cybersecurity incident response coordinated with suppliers and third parties?",
          "GV.SC-05",
          "HIGH",
        ),
        statusQuestion(
          "Is supply chain security included in security planning and testing?",
          "GV.SC-06",
          "HIGH",
        ),
        statusQuestion(
          "Are vulnerabilities in supplier products and services monitored and managed?",
          "GV.SC-07",
          "HIGH",
        ),
        statusQuestion(
          "Are shared cybersecurity responsibilities with suppliers established and documented?",
          "GV.SC-08",
          "HIGH",
        ),
      ],
    },
    {
      title: "Identify (ID)",
      questions: [
        statusQuestion(
          "Is an inventory of physical devices and systems maintained?",
          "ID.AM-01",
          "HIGH",
        ),
        statusQuestion(
          "Is an inventory of software platforms and applications maintained?",
          "ID.AM-02",
          "HIGH",
        ),
        statusQuestion(
          "Are organizational communication and data flows mapped and documented?",
          "ID.AM-03",
          "MEDIUM",
        ),
        statusQuestion(
          "Is a catalogue of external information systems and services maintained?",
          "ID.AM-04",
          "MEDIUM",
        ),
        statusQuestion(
          "Are resources prioritized based on classification, criticality, and business value?",
          "ID.AM-05",
          "HIGH",
        ),
        statusQuestion(
          "Are cybersecurity roles and responsibilities defined for the workforce and third parties?",
          "ID.AM-06",
          "MEDIUM",
        ),
        statusQuestion(
          "Is a comprehensive asset inventory with cybersecurity categorization maintained?",
          "ID.AM-07",
          "HIGH",
        ),
        statusQuestion(
          "Is data classified according to sensitivity and managed with appropriate handling requirements?",
          "ID.AM-08",
          "HIGH",
        ),
        statusQuestion(
          "Are asset vulnerabilities identified and documented through regular vulnerability assessments?",
          "ID.RA-01",
          "HIGH",
        ),
        statusQuestion(
          "Is cyber threat intelligence received from information sharing forums and sources?",
          "ID.RA-02",
          "HIGH",
        ),
        statusQuestion(
          "Are internal and external threats to organizational assets identified and documented?",
          "ID.RA-03",
          "HIGH",
        ),
        statusQuestion(
          "Are potential business impacts and likelihoods from threat scenarios identified?",
          "ID.RA-04",
          "HIGH",
        ),
        statusQuestion(
          "Are risks determined using threats, vulnerabilities, likelihoods, and impacts?",
          "ID.RA-05",
          "HIGH",
        ),
        statusQuestion(
          "Are risk responses identified and prioritized based on objectives and risk appetite?",
          "ID.RA-06",
          "HIGH",
        ),
        statusQuestion(
          "Are changes and exceptions assessed and managed for risk?",
          "ID.RA-07",
          "HIGH",
        ),
        statusQuestion(
          "Are processes established to receive, analyze, and respond to vulnerability disclosures?",
          "ID.RA-08",
          "HIGH",
        ),
        statusQuestion(
          "Are critical suppliers assessed for cybersecurity risk?",
          "ID.RA-09",
          "HIGH",
        ),
        statusQuestion(
          "Is critical supply chain risk assessed and managed in coordination with suppliers?",
          "ID.RA-10",
          "HIGH",
        ),
        statusQuestion(
          "Are improvements to cybersecurity risk management identified from internal and external evaluations?",
          "ID.IM-01",
          "MEDIUM",
        ),
        statusQuestion(
          "Are improvements identified from security tests and exercises?",
          "ID.IM-02",
          "MEDIUM",
        ),
        statusQuestion(
          "Are improvements captured during execution of operational processes and procedures?",
          "ID.IM-03",
          "MEDIUM",
        ),
        statusQuestion(
          "Are prioritized improvements incorporated into your risk management plans?",
          "ID.IM-04",
          "MEDIUM",
        ),
      ],
    },
    {
      title: "Protect (PR)",
      questions: [
        statusQuestion(
          "Are identities and credentials issued, managed, verified, revoked, and audited for authorized devices and users?",
          "PR.AA-01",
          "CRITICAL",
        ),
        statusQuestion(
          "Is physical access to assets managed and protected commensurate with risk?",
          "PR.AA-02",
          "HIGH",
        ),
        statusQuestion(
          "Is remote access to assets managed using secure channels?",
          "PR.AA-03",
          "CRITICAL",
        ),
        statusQuestion(
          "Are access permissions and authorizations managed incorporating least privilege?",
          "PR.AA-04",
          "CRITICAL",
        ),
        statusQuestion(
          "Is network segregation used to minimize interactions between networks based on risk?",
          "PR.AA-05",
          "HIGH",
        ),
        statusQuestion(
          "Is identity proofing performed before granting credentials to users, devices, and assets?",
          "PR.AA-06",
          "HIGH",
        ),
        statusQuestion(
          "Are all users provided cybersecurity awareness training upon hire and annually?",
          "PR.AT-01",
          "HIGH",
        ),
        statusQuestion(
          "Do privileged users understand their specific cybersecurity roles and responsibilities?",
          "PR.AT-02",
          "MEDIUM",
        ),
        statusQuestion(
          "Do third-party stakeholders understand their cybersecurity roles and responsibilities?",
          "PR.AT-03",
          "MEDIUM",
        ),
        statusQuestion(
          "Is physical security awareness training provided to all personnel?",
          "PR.AT-04",
          "MEDIUM",
        ),
        statusQuestion(
          "Is social engineering and phishing awareness training provided with simulated exercises?",
          "PR.AT-05",
          "HIGH",
        ),
        statusQuestion(
          "Is data at rest protected through encryption and access controls?",
          "PR.DS-01",
          "CRITICAL",
        ),
        statusQuestion(
          "Is data in transit protected through encryption?",
          "PR.DS-02",
          "CRITICAL",
        ),
        statusQuestion(
          "Are assets formally managed throughout removal, transfers, and disposition?",
          "PR.DS-03",
          "HIGH",
        ),
        statusQuestion(
          "Is adequate capacity maintained to ensure availability and performance of systems?",
          "PR.DS-04",
          "HIGH",
        ),
        statusQuestion(
          "Is protection against data leaks implemented using mechanisms such as data loss prevention?",
          "PR.DS-05",
          "CRITICAL",
        ),
        statusQuestion(
          "Are integrity checking mechanisms used to verify software, firmware, and information integrity?",
          "PR.DS-06",
          "HIGH",
        ),
        statusQuestion(
          "Are development and testing environments separate from production environments?",
          "PR.DS-07",
          "HIGH",
        ),
        statusQuestion(
          "Are integrity checking mechanisms implemented for hardware components where appropriate?",
          "PR.DS-08",
          "HIGH",
        ),
        statusQuestion(
          "Is data managed according to its sensitivity and retention policies?",
          "PR.DS-09",
          "HIGH",
        ),
        statusQuestion(
          "Is data and media securely disposed of when no longer needed?",
          "PR.DS-10",
          "HIGH",
        ),
        statusQuestion(
          "Are backups of critical data and configurations created, protected, and tested?",
          "PR.DS-11",
          "CRITICAL",
        ),
        statusQuestion(
          "Are secure configuration management policies and baselines established and applied?",
          "PR.PS-01",
          "HIGH",
        ),
        statusQuestion(
          "Is software maintained and replaced according to policy, monitoring for end-of-life and vulnerabilities?",
          "PR.PS-02",
          "HIGH",
        ),
        statusQuestion(
          "Is hardware maintained and replaced according to policy, monitoring for end-of-life and vulnerabilities?",
          "PR.PS-03",
          "HIGH",
        ),
        statusQuestion(
          "Are log records generated and retained for continuous monitoring of system and user activities?",
          "PR.PS-04",
          "HIGH",
        ),
        statusQuestion(
          "Is malicious code protection installed and maintained on all applicable assets?",
          "PR.PS-05",
          "CRITICAL",
        ),
        statusQuestion(
          "Are secure software development practices integrated into the development lifecycle?",
          "PR.PS-06",
          "HIGH",
        ),
        statusQuestion(
          "Are networks and environments protected from unauthorized logical access and usage?",
          "PR.IR-01",
          "HIGH",
        ),
        statusQuestion(
          "Are technology infrastructure resilience requirements documented?",
          "PR.IR-02",
          "HIGH",
        ),
        statusQuestion(
          "Are redundant systems and components implemented to meet resilience requirements?",
          "PR.IR-03",
          "HIGH",
        ),
        statusQuestion(
          "Is adequate resource capacity maintained for resilience (power, cooling, bandwidth)?",
          "PR.IR-04",
          "HIGH",
        ),
      ],
    },
    {
      title: "Detect (DE)",
      questions: [
        statusQuestion(
          "Are networks continuously monitored for anomalous cybersecurity events?",
          "DE.CM-01",
          "CRITICAL",
        ),
        statusQuestion(
          "Is the physical environment monitored to detect adverse cybersecurity events?",
          "DE.CM-02",
          "HIGH",
        ),
        statusQuestion(
          "Is personnel activity monitored to detect adverse cybersecurity events?",
          "DE.CM-03",
          "HIGH",
        ),
        statusQuestion(
          "Is malicious code detected through continuous monitoring mechanisms?",
          "DE.CM-04",
          "CRITICAL",
        ),
        statusQuestion(
          "Is unauthorized mobile code detected and blocked?",
          "DE.CM-05",
          "HIGH",
        ),
        statusQuestion(
          "Is external service provider activity monitored for anomalous or unauthorized activity?",
          "DE.CM-06",
          "HIGH",
        ),
        statusQuestion(
          "Are unauthorized personnel, connections, devices, and software detected on networks?",
          "DE.CM-07",
          "HIGH",
        ),
        statusQuestion(
          "Are vulnerability scans performed on organizational assets and findings remediated?",
          "DE.CM-08",
          "CRITICAL",
        ),
        statusQuestion(
          "Are vulnerability scans performed on third-party software and assets when appropriate?",
          "DE.CM-09",
          "HIGH",
        ),
        statusQuestion(
          "Are adverse events analyzed to determine root cause and impact?",
          "DE.AE-01",
          "HIGH",
        ),
        statusQuestion(
          "Are events from multiple sources correlated and triaged?",
          "DE.AE-02",
          "HIGH",
        ),
        statusQuestion(
          "Is the scope, impact, and magnitude of adverse events determined?",
          "DE.AE-03",
          "HIGH",
        ),
        statusQuestion(
          "Are adverse events categorized and prioritized by severity?",
          "DE.AE-04",
          "HIGH",
        ),
        statusQuestion(
          "Are incidents declared based on analysis of adverse events?",
          "DE.AE-05",
          "HIGH",
        ),
        statusQuestion(
          "Is forensic data collected and preserved for incident analysis?",
          "DE.AE-06",
          "HIGH",
        ),
        statusQuestion(
          "Are detection processes continuously improved from lessons learned?",
          "DE.AE-07",
          "HIGH",
        ),
        statusQuestion(
          "Is detection information shared with relevant stakeholders?",
          "DE.AE-08",
          "HIGH",
        ),
      ],
    },
    {
      title: "Respond (RS)",
      questions: [
        statusQuestion(
          "Is your incident response plan executed during or after an incident?",
          "RS.MA-01",
          "CRITICAL",
        ),
        statusQuestion(
          "Are incident reports received, triaged, and validated?",
          "RS.MA-02",
          "HIGH",
        ),
        statusQuestion(
          "Are incidents categorized and prioritized by severity and impact?",
          "RS.MA-03",
          "HIGH",
        ),
        statusQuestion(
          "Are incidents escalated according to established severity criteria?",
          "RS.MA-04",
          "HIGH",
        ),
        statusQuestion(
          "Are incidents investigated to determine root cause, scope, and impact?",
          "RS.MA-05",
          "HIGH",
        ),
        statusQuestion(
          "Are incidents analyzed to understand adversary tactics, techniques, and procedures?",
          "RS.AN-01",
          "HIGH",
        ),
        statusQuestion(
          "Is forensic analysis conducted on affected systems to determine the extent of compromise?",
          "RS.AN-02",
          "HIGH",
        ),
        statusQuestion(
          "Are indicators of compromise identified and shared with security communities?",
          "RS.AN-03",
          "HIGH",
        ),
        statusQuestion(
          "Does incident analysis inform future response improvements?",
          "RS.AN-04",
          "HIGH",
        ),
        statusQuestion(
          "Are incidents reported to designated internal stakeholders?",
          "RS.CO-01",
          "HIGH",
        ),
        statusQuestion(
          "Are incidents reported to designated external stakeholders such as regulators and law enforcement?",
          "RS.CO-02",
          "HIGH",
        ),
        statusQuestion(
          "Is incident-related information shared with stakeholders per response plans?",
          "RS.CO-03",
          "MEDIUM",
        ),
        statusQuestion(
          "Does your organization participate in voluntary information sharing with threat-sharing groups?",
          "RS.CO-04",
          "MEDIUM",
        ),
        statusQuestion(
          "Is public communication during incidents coordinated through approved channels?",
          "RS.CO-05",
          "MEDIUM",
        ),
        statusQuestion(
          "Are containment strategies executed to prevent further incident damage?",
          "RS.MI-01",
          "CRITICAL",
        ),
        statusQuestion(
          "Are malicious artifacts eradicated from affected systems?",
          "RS.MI-02",
          "CRITICAL",
        ),
        statusQuestion(
          "Are affected systems restored to a known good state?",
          "RS.MI-03",
          "CRITICAL",
        ),
      ],
    },
    {
      title: "Recover (RC)",
      questions: [
        statusQuestion(
          "Is your recovery plan executed during or after an incident to restore capabilities and services?",
          "RC.RP-01",
          "CRITICAL",
        ),
        statusQuestion(
          "Are recovery actions selected based on predefined criteria and priorities?",
          "RC.RP-02",
          "HIGH",
        ),
        statusQuestion(
          "Is the integrity of backed-up data verified before restoration?",
          "RC.RP-03",
          "HIGH",
        ),
        statusQuestion(
          "Are critical mission functions and business processes prioritized for restoration?",
          "RC.RP-04",
          "CRITICAL",
        ),
        statusQuestion(
          "Are adequate resources available to support recovery operations?",
          "RC.RP-05",
          "HIGH",
        ),
        statusQuestion(
          "Are recovery activities coordinated with internal and external parties?",
          "RC.RP-06",
          "HIGH",
        ),
        statusQuestion(
          "Are public relations and reputation managed following an incident?",
          "RC.CO-01",
          "MEDIUM",
        ),
        statusQuestion(
          "Is a reputation-repair communications strategy executed after an incident?",
          "RC.CO-02",
          "MEDIUM",
        ),
        statusQuestion(
          "Are recovery activities communicated to stakeholders?",
          "RC.CO-03",
          "MEDIUM",
        ),
        statusQuestion(
          "Are lessons learned from recovery shared with stakeholders?",
          "RC.CO-04",
          "MEDIUM",
        ),
        statusQuestion(
          "Are updates to cybersecurity strategy shared based on recovery lessons learned?",
          "RC.CO-05",
          "MEDIUM",
        ),
      ],
    },
  ],
};
