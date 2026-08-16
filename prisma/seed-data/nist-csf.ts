import { type FrameworkSeed } from "./types";

const GOVERN = "Govern (GV)";
const IDENTIFY = "Identify (ID)";
const PROTECT = "Protect (PR)";
const DETECT = "Detect (DE)";
const RESPOND = "Respond (RS)";
const RECOVER = "Recover (RC)";

export const nistCsf: FrameworkSeed = {
  name: "NIST CSF",
  version: "2.0",
  description:
    "NIST Cybersecurity Framework 2.0 (2024) — 129 outcome-based subcategories across 6 functions: Govern, Identify, Protect, Detect, Respond, Recover.",
  controls: [
    // Govern (GV)
    {
      domain: GOVERN,
      code: "GV.OC-01",
      title:
        "Organizational mission and stakeholder expectations are understood",
      guidance:
        "Understand the organization's mission, stakeholder expectations, and dependencies for cybersecurity.",
    },
    {
      domain: GOVERN,
      code: "GV.OC-02",
      title: "Internal and external dependencies are understood",
      guidance:
        "Identify and communicate internal and external dependencies critical to the organization.",
    },
    {
      domain: GOVERN,
      code: "GV.OC-03",
      title: "Legal, regulatory, and contractual requirements are understood",
      guidance:
        "Determine and manage legal, regulatory, and contractual cybersecurity obligations.",
    },
    {
      domain: GOVERN,
      code: "GV.OC-04",
      title: "Critical objectives and capabilities are communicated",
      guidance:
        "Communicate cybersecurity-critical objectives, capabilities, and services across the organization.",
    },
    {
      domain: GOVERN,
      code: "GV.OC-05",
      title: "Outcomes, capabilities, and services are prioritized",
      guidance:
        "Prioritize outcomes, capabilities, and services based on criticality to mission.",
    },
    {
      domain: GOVERN,
      code: "GV.RM-01",
      title: "Risk management objectives are established",
      guidance:
        "Establish cybersecurity risk management objectives agreed to by stakeholders.",
    },
    {
      domain: GOVERN,
      code: "GV.RM-02",
      title: "Risk appetite and tolerance statements are established",
      guidance:
        "Determine, communicate, and use risk appetite and tolerance for cybersecurity risk.",
    },
    {
      domain: GOVERN,
      code: "GV.RM-03",
      title: "Cybersecurity risk is integrated into enterprise risk management",
      guidance:
        "Integrate cybersecurity risk management into overall enterprise risk management.",
    },
    {
      domain: GOVERN,
      code: "GV.RM-04",
      title: "Strategic direction for cybersecurity risk is established",
      guidance:
        "Establish and communicate strategic direction describing desired cybersecurity outcomes.",
    },
    {
      domain: GOVERN,
      code: "GV.RM-05",
      title: "Lines of communication for cybersecurity risk are established",
      guidance:
        "Establish and maintain lines of communication for cybersecurity risk across the organization.",
    },
    {
      domain: GOVERN,
      code: "GV.RM-06",
      title: "Standardized method for calculating risk is established",
      guidance:
        "Use a standardized method for calculating, prioritizing, and communicating cybersecurity risk.",
    },
    {
      domain: GOVERN,
      code: "GV.RM-07",
      title: "Strategic opportunities are informed by cybersecurity risk",
      guidance:
        "Ensure strategic opportunities are informed by the organization's cybersecurity risk posture.",
    },
    {
      domain: GOVERN,
      code: "GV.RR-01",
      title: "Cybersecurity leadership roles are established",
      guidance:
        "Establish cybersecurity leadership roles and responsibilities aligned with business strategy.",
    },
    {
      domain: GOVERN,
      code: "GV.RR-02",
      title: "Cybersecurity roles and responsibilities are established",
      guidance:
        "Establish, communicate, and maintain cybersecurity roles and responsibilities.",
    },
    {
      domain: GOVERN,
      code: "GV.RR-03",
      title: "Adequate resources are allocated for cybersecurity",
      guidance:
        "Allocate adequate financial, personnel, and technology resources to manage cybersecurity risk.",
    },
    {
      domain: GOVERN,
      code: "GV.RR-04",
      title: "Cybersecurity is included in human resources practices",
      guidance:
        "Include cybersecurity requirements in human resources practices such as hiring and termination.",
    },
    {
      domain: GOVERN,
      code: "GV.PO-01",
      title: "Cybersecurity policies are established and communicated",
      guidance:
        "Establish, communicate, and enforce cybersecurity policies based on risk appetite.",
    },
    {
      domain: GOVERN,
      code: "GV.PO-02",
      title: "Cybersecurity policies are reviewed and updated",
      guidance:
        "Review and update cybersecurity policies at defined intervals and after significant events.",
    },
    {
      domain: GOVERN,
      code: "GV.PO-03",
      title: "Cybersecurity processes and procedures are established",
      guidance:
        "Establish, communicate, and maintain cybersecurity processes and procedures.",
    },
    {
      domain: GOVERN,
      code: "GV.OV-01",
      title: "Cybersecurity risk management outcomes are reviewed",
      guidance:
        "Review cybersecurity risk management outcomes to inform continuous improvement.",
    },
    {
      domain: GOVERN,
      code: "GV.OV-02",
      title: "Cybersecurity risk management is periodically reviewed",
      guidance:
        "Conduct periodic reviews of the cybersecurity risk management program.",
    },
    {
      domain: GOVERN,
      code: "GV.OV-03",
      title: "Performance against cybersecurity objectives is evaluated",
      guidance:
        "Evaluate performance against established cybersecurity objectives and report to management.",
    },
    {
      domain: GOVERN,
      code: "GV.SC-01",
      title:
        "Supply chain cybersecurity risk management program is established",
      guidance:
        "Establish a cybersecurity supply chain risk management program for suppliers and third parties.",
    },
    {
      domain: GOVERN,
      code: "GV.SC-02",
      title: "Cybersecurity requirements are included in supplier agreements",
      guidance:
        "Include cybersecurity requirements in contracts and agreements with suppliers and third parties.",
    },
    {
      domain: GOVERN,
      code: "GV.SC-03",
      title: "Supply chain risk is assessed and managed",
      guidance:
        "Integrate cybersecurity supply chain risk assessment into acquisition and procurement processes.",
    },
    {
      domain: GOVERN,
      code: "GV.SC-04",
      title: "Suppliers are assessed against cybersecurity requirements",
      guidance:
        "Evaluate suppliers and third-party partners against cybersecurity requirements regularly.",
    },
    {
      domain: GOVERN,
      code: "GV.SC-05",
      title: "Supply chain incident response is coordinated",
      guidance:
        "Plan and coordinate cybersecurity incident response activities with suppliers and third parties.",
    },
    {
      domain: GOVERN,
      code: "GV.SC-06",
      title: "Supply chain security is included in planning and testing",
      guidance:
        "Integrate cybersecurity supply chain risk management into security planning and testing.",
    },
    {
      domain: GOVERN,
      code: "GV.SC-07",
      title: "Supplier vulnerabilities are monitored and managed",
      guidance:
        "Monitor for vulnerabilities in supplier products and services and manage appropriately.",
    },
    {
      domain: GOVERN,
      code: "GV.SC-08",
      title: "Shared responsibilities with suppliers are established",
      guidance:
        "Establish and document shared cybersecurity responsibilities with relevant suppliers.",
    },

    // Identify (ID)
    {
      domain: IDENTIFY,
      code: "ID.AM-01",
      title: "Physical devices and systems are inventoried",
      guidance:
        "Maintain an inventory of physical devices and systems within the organization.",
    },
    {
      domain: IDENTIFY,
      code: "ID.AM-02",
      title: "Software platforms and applications are inventoried",
      guidance:
        "Maintain an inventory of software platforms and applications within the organization.",
    },
    {
      domain: IDENTIFY,
      code: "ID.AM-03",
      title: "Organizational communication and data flows are mapped",
      guidance:
        "Map and document the communication and data flows of the organization.",
    },
    {
      domain: IDENTIFY,
      code: "ID.AM-04",
      title: "External information systems are catalogued",
      guidance:
        "Maintain a catalogue of external information systems and services used.",
    },
    {
      domain: IDENTIFY,
      code: "ID.AM-05",
      title:
        "Resources are prioritized based on classification and criticality",
      guidance:
        "Prioritize resources based on classification, criticality, and business value.",
    },
    {
      domain: IDENTIFY,
      code: "ID.AM-06",
      title: "Cybersecurity roles and responsibilities are established",
      guidance:
        "Define cybersecurity roles and responsibilities for workforce and third parties.",
    },
    {
      domain: IDENTIFY,
      code: "ID.AM-07",
      title:
        "Organizational assets and their cybersecurity categorization are maintained",
      guidance:
        "Maintain a comprehensive asset inventory with cybersecurity categorization.",
    },
    {
      domain: IDENTIFY,
      code: "ID.AM-08",
      title: "Data classified and managed according to sensitivity",
      guidance:
        "Classify data according to sensitivity and apply appropriate handling requirements.",
    },
    {
      domain: IDENTIFY,
      code: "ID.RA-01",
      title: "Asset vulnerabilities are identified and documented",
      guidance:
        "Identify and document asset vulnerabilities through regular vulnerability assessment.",
    },
    {
      domain: IDENTIFY,
      code: "ID.RA-02",
      title: "Threat intelligence is received from external sources",
      guidance:
        "Consume cyber threat intelligence from information sharing forums and sources.",
    },
    {
      domain: IDENTIFY,
      code: "ID.RA-03",
      title: "Threats are identified and documented",
      guidance:
        "Identify and document internal and external threats to organizational assets.",
    },
    {
      domain: IDENTIFY,
      code: "ID.RA-04",
      title: "Potential impacts of threats are identified",
      guidance:
        "Identify potential business impacts and likelihoods from threat scenarios.",
    },
    {
      domain: IDENTIFY,
      code: "ID.RA-05",
      title:
        "Risks are identified using threats, vulnerabilities, likelihoods, and impacts",
      guidance:
        "Use threats, vulnerabilities, likelihoods, and impacts to determine risk.",
    },
    {
      domain: IDENTIFY,
      code: "ID.RA-06",
      title: "Risk responses are identified and prioritized",
      guidance:
        "Identify and prioritize risk responses based on organizational objectives and risk appetite.",
    },
    {
      domain: IDENTIFY,
      code: "ID.RA-07",
      title: "Changes and exceptions are managed and risk is assessed",
      guidance:
        "Assess and manage risk associated with changes and exceptions.",
    },
    {
      domain: IDENTIFY,
      code: "ID.RA-08",
      title:
        "Critical processes for cybersecurity risk management are established",
      guidance:
        "Establish processes to receive, analyze, and respond to vulnerability disclosures.",
    },
    {
      domain: IDENTIFY,
      code: "ID.RA-09",
      title: "Critical suppliers are assessed for cybersecurity risk",
      guidance:
        "Assess critical suppliers and third-party partners for cybersecurity risk.",
    },
    {
      domain: IDENTIFY,
      code: "ID.RA-10",
      title: "Critical supply chain risk is assessed and managed",
      guidance:
        "Assess and manage critical supply chain risks in coordination with suppliers.",
    },
    {
      domain: IDENTIFY,
      code: "ID.IM-01",
      title: "Improvements are identified from evaluations",
      guidance:
        "Identify improvements to cybersecurity risk management from internal and external evaluations.",
    },
    {
      domain: IDENTIFY,
      code: "ID.IM-02",
      title: "Improvements are identified from security tests and exercises",
      guidance:
        "Identify improvements from security tests and exercises, including penetration tests.",
    },
    {
      domain: IDENTIFY,
      code: "ID.IM-03",
      title: "Improvements are identified from execution of processes",
      guidance:
        "Capture improvements identified during execution of operational processes and procedures.",
    },
    {
      domain: IDENTIFY,
      code: "ID.IM-04",
      title: "Improvements are incorporated into risk management plans",
      guidance:
        "Incorporate prioritized improvements into organizational cybersecurity risk management plans.",
    },

    // Protect (PR)
    {
      domain: PROTECT,
      code: "PR.AA-01",
      title:
        "Identities and credentials are managed for authorized devices and users",
      guidance:
        "Issue, manage, verify, revoke, and audit identities and credentials for authorized devices and users.",
    },
    {
      domain: PROTECT,
      code: "PR.AA-02",
      title: "Physical access to assets is managed and protected",
      guidance:
        "Manage and protect physical access to assets commensurate with risk.",
    },
    {
      domain: PROTECT,
      code: "PR.AA-03",
      title: "Remote access is managed",
      guidance:
        "Manage remote access to organizational assets using secure channels.",
    },
    {
      domain: PROTECT,
      code: "PR.AA-04",
      title: "Access permissions are managed incorporating least privilege",
      guidance:
        "Manage access permissions and authorizations incorporating principles of least privilege.",
    },
    {
      domain: PROTECT,
      code: "PR.AA-05",
      title: "Network segregation is used where appropriate",
      guidance:
        "Use network segregation to minimize interactions between networks based on risk.",
    },
    {
      domain: PROTECT,
      code: "PR.AA-06",
      title: "Identity proofing is used before granting credentials",
      guidance:
        "Verify the identity of users, devices, and other assets before granting credentials.",
    },
    {
      domain: PROTECT,
      code: "PR.AT-01",
      title: "All users are informed and trained",
      guidance:
        "Ensure all users are provided cybersecurity awareness training upon hire and annually.",
    },
    {
      domain: PROTECT,
      code: "PR.AT-02",
      title: "Privileged users understand roles and responsibilities",
      guidance:
        "Ensure privileged users understand their specific roles and responsibilities for cybersecurity.",
    },
    {
      domain: PROTECT,
      code: "PR.AT-03",
      title: "Third-party stakeholders understand roles and responsibilities",
      guidance:
        "Ensure third-party stakeholders understand cybersecurity roles and responsibilities.",
    },
    {
      domain: PROTECT,
      code: "PR.AT-04",
      title: "Physical security awareness training is provided",
      guidance:
        "Provide physical security awareness training to all personnel.",
    },
    {
      domain: PROTECT,
      code: "PR.AT-05",
      title: "Social engineering and phishing awareness training is provided",
      guidance:
        "Provide social engineering and phishing awareness training and run simulated exercises.",
    },
    {
      domain: PROTECT,
      code: "PR.DS-01",
      title: "Data-at-rest is protected",
      guidance:
        "Protect the confidentiality, integrity, and availability of data-at-rest through encryption and access controls.",
    },
    {
      domain: PROTECT,
      code: "PR.DS-02",
      title: "Data-in-transit is protected",
      guidance:
        "Protect the confidentiality, integrity, and availability of data-in-transit through encryption.",
    },
    {
      domain: PROTECT,
      code: "PR.DS-03",
      title:
        "Assets are formally managed throughout removal, transfers, and disposition",
      guidance:
        "Manage assets throughout removal, transfers, and disposition with appropriate controls.",
    },
    {
      domain: PROTECT,
      code: "PR.DS-04",
      title: "Adequate capacity is maintained to ensure availability",
      guidance:
        "Maintain adequate capacity to ensure availability and performance of systems and services.",
    },
    {
      domain: PROTECT,
      code: "PR.DS-05",
      title: "Protection against data leaks is implemented",
      guidance:
        "Implement protection against data leaks using mechanisms such as data loss prevention tools.",
    },
    {
      domain: PROTECT,
      code: "PR.DS-06",
      title: "Integrity checking mechanisms are used",
      guidance:
        "Use integrity checking mechanisms to verify software, firmware, and information integrity.",
    },
    {
      domain: PROTECT,
      code: "PR.DS-07",
      title:
        "Development and testing environments are separate from production",
      guidance:
        "Ensure development and testing environments are separate from production environments.",
    },
    {
      domain: PROTECT,
      code: "PR.DS-08",
      title: "Integrity checking hardware is implemented",
      guidance:
        "Implement integrity checking mechanisms for hardware components where appropriate.",
    },
    {
      domain: PROTECT,
      code: "PR.DS-09",
      title: "Data is managed according to retention policies",
      guidance:
        "Manage data according to its sensitivity and organizational retention policies.",
    },
    {
      domain: PROTECT,
      code: "PR.DS-10",
      title: "Data is securely disposed of when no longer needed",
      guidance:
        "Securely dispose of data and media when no longer needed per policy and regulatory requirements.",
    },
    {
      domain: PROTECT,
      code: "PR.DS-11",
      title: "Data backups are created and maintained",
      guidance:
        "Create, protect, and test backups of critical data and configurations regularly.",
    },
    {
      domain: PROTECT,
      code: "PR.PS-01",
      title: "Configuration management practices are established and applied",
      guidance:
        "Establish and apply secure configuration management policies and baselines.",
    },
    {
      domain: PROTECT,
      code: "PR.PS-02",
      title: "Software is maintained and replaced in accordance with policy",
      guidance:
        "Maintain and replace software according to policy, monitoring for end-of-life and vulnerabilities.",
    },
    {
      domain: PROTECT,
      code: "PR.PS-03",
      title: "Hardware is maintained and replaced in accordance with policy",
      guidance:
        "Maintain and replace hardware according to policy, monitoring for end-of-life and vulnerabilities.",
    },
    {
      domain: PROTECT,
      code: "PR.PS-04",
      title:
        "Log records are generated and available for continuous monitoring",
      guidance:
        "Generate and retain log records for continuous monitoring of system and user activities.",
    },
    {
      domain: PROTECT,
      code: "PR.PS-05",
      title: "Malicious code protection is installed and maintained",
      guidance:
        "Install and maintain malicious code protection mechanisms on all applicable assets.",
    },
    {
      domain: PROTECT,
      code: "PR.PS-06",
      title: "Secure software development practices are integrated",
      guidance:
        "Integrate secure software development practices into the system development lifecycle.",
    },
    {
      domain: PROTECT,
      code: "PR.IR-01",
      title: "Networks and environments are protected from unauthorized access",
      guidance:
        "Protect networks and environments from unauthorized logical access and usage.",
    },
    {
      domain: PROTECT,
      code: "PR.IR-02",
      title: "Security architecture resilience requirements are documented",
      guidance:
        "Plan for technology infrastructure resilience based on business and security requirements.",
    },
    {
      domain: PROTECT,
      code: "PR.IR-03",
      title:
        "Redundant systems are implemented to meet resilience requirements",
      guidance:
        "Implement redundant systems and components to meet organizational resilience requirements.",
    },
    {
      domain: PROTECT,
      code: "PR.IR-04",
      title: "Adequate resource capacity is maintained for resilience",
      guidance:
        "Maintain adequate resource capacity, including power, cooling, and bandwidth, to meet resilience requirements.",
    },

    // Detect (DE)
    {
      domain: DETECT,
      code: "DE.CM-01",
      title: "Networks are monitored for cybersecurity events",
      guidance:
        "Continuously monitor networks and network services for anomalous cybersecurity events.",
    },
    {
      domain: DETECT,
      code: "DE.CM-02",
      title: "Physical environment is monitored for cybersecurity events",
      guidance:
        "Monitor the physical environment to detect potentially adverse cybersecurity events.",
    },
    {
      domain: DETECT,
      code: "DE.CM-03",
      title: "Personnel activity is monitored for cybersecurity events",
      guidance:
        "Monitor personnel activity to detect potentially adverse cybersecurity events.",
    },
    {
      domain: DETECT,
      code: "DE.CM-04",
      title: "Malicious code is detected through continuous monitoring",
      guidance:
        "Detect malicious code through deployment of detection mechanisms across the environment.",
    },
    {
      domain: DETECT,
      code: "DE.CM-05",
      title: "Unauthorized mobile code is detected",
      guidance:
        "Detect and block unauthorized execution of mobile code on organizational assets.",
    },
    {
      domain: DETECT,
      code: "DE.CM-06",
      title: "External service provider activity is monitored",
      guidance:
        "Monitor activities of external service providers for anomalous or unauthorized activity.",
    },
    {
      domain: DETECT,
      code: "DE.CM-07",
      title: "Unauthorized personnel, connections, and devices are detected",
      guidance:
        "Monitor for unauthorized personnel, connections, devices, and software on organizational networks.",
    },
    {
      domain: DETECT,
      code: "DE.CM-08",
      title: "Vulnerability scans are performed on organizational assets",
      guidance:
        "Perform vulnerability scans on organizational assets and remediate findings in a timely manner.",
    },
    {
      domain: DETECT,
      code: "DE.CM-09",
      title: "Vulnerability scans are performed on third-party assets",
      guidance:
        "Perform vulnerability scans when appropriate on third-party software and assets.",
    },
    {
      domain: DETECT,
      code: "DE.AE-01",
      title: "Adverse events are analyzed to determine root cause",
      guidance:
        "Analyze detected adverse events to understand root causes and impact.",
    },
    {
      domain: DETECT,
      code: "DE.AE-02",
      title: "Events are correlated and triaged",
      guidance:
        "Correlate and triage adverse events from multiple sources to determine whether they constitute an incident.",
    },
    {
      domain: DETECT,
      code: "DE.AE-03",
      title: "Impact of adverse events is determined",
      guidance:
        "Determine the scope, impact, and magnitude of adverse events across organizational systems.",
    },
    {
      domain: DETECT,
      code: "DE.AE-04",
      title: "Adverse events are categorized and prioritized",
      guidance:
        "Categorize and prioritize adverse events according to defined incident severity criteria.",
    },
    {
      domain: DETECT,
      code: "DE.AE-05",
      title: "Incidents are declared based on event analysis",
      guidance:
        "Declare cybersecurity incidents based on analysis of adverse events and predefined criteria.",
    },
    {
      domain: DETECT,
      code: "DE.AE-06",
      title: "Forensic data is collected for incident analysis",
      guidance:
        "Collect, preserve, and analyze forensic data related to adverse events and incidents.",
    },
    {
      domain: DETECT,
      code: "DE.AE-07",
      title: "Detection processes are continuously improved",
      guidance:
        "Improve detection processes based on lessons learned from adverse events and incidents.",
    },
    {
      domain: DETECT,
      code: "DE.AE-08",
      title: "Detection information is shared with relevant stakeholders",
      guidance:
        "Share relevant detection information with appropriate internal and external stakeholders.",
    },

    // Respond (RS)
    {
      domain: RESPOND,
      code: "RS.MA-01",
      title: "Incident response plan is executed during or after an incident",
      guidance:
        "Execute the incident response plan and related processes upon detection of an incident.",
    },
    {
      domain: RESPOND,
      code: "RS.MA-02",
      title: "Incident reports are triaged and validated",
      guidance:
        "Receive, triage, and validate incident reports from internal and external sources.",
    },
    {
      domain: RESPOND,
      code: "RS.MA-03",
      title: "Incidents are categorized and prioritized",
      guidance:
        "Categorize and prioritize incidents based on severity, impact, and organizational priorities.",
    },
    {
      domain: RESPOND,
      code: "RS.MA-04",
      title: "Incidents are escalated according to established criteria",
      guidance:
        "Escalate incidents according to established severity criteria and stakeholder involvement requirements.",
    },
    {
      domain: RESPOND,
      code: "RS.MA-05",
      title: "Incidents are investigated to determine root cause",
      guidance:
        "Investigate incidents to determine root cause, scope, and impact on the organization.",
    },
    {
      domain: RESPOND,
      code: "RS.AN-01",
      title: "Incidents are analyzed to understand adversary behavior",
      guidance:
        "Analyze incidents to understand adversary tactics, techniques, and procedures (TTPs).",
    },
    {
      domain: RESPOND,
      code: "RS.AN-02",
      title: "Forensic analysis is conducted on affected systems",
      guidance:
        "Conduct forensic analysis on affected systems to determine the extent of compromise.",
    },
    {
      domain: RESPOND,
      code: "RS.AN-03",
      title: "Indicators of compromise are identified and shared",
      guidance:
        "Identify indicators of compromise and share with relevant security communities.",
    },
    {
      domain: RESPOND,
      code: "RS.AN-04",
      title: "Incident analysis informs future response improvements",
      guidance:
        "Use incident analysis findings to improve the incident response plan and related capabilities.",
    },
    {
      domain: RESPOND,
      code: "RS.CO-01",
      title: "Incidents are reported to designated internal stakeholders",
      guidance:
        "Notify designated internal stakeholders of incidents according to defined procedures.",
    },
    {
      domain: RESPOND,
      code: "RS.CO-02",
      title: "Incidents are reported to designated external stakeholders",
      guidance:
        "Notify designated external stakeholders such as regulators and law enforcement as required.",
    },
    {
      domain: RESPOND,
      code: "RS.CO-03",
      title: "Information is shared with relevant stakeholders",
      guidance:
        "Share incident-related information with designated stakeholders based on response plans.",
    },
    {
      domain: RESPOND,
      code: "RS.CO-04",
      title: "Voluntary information sharing occurs with external stakeholders",
      guidance:
        "Participate in voluntary information sharing with cybersecurity communities and threat-sharing groups.",
    },
    {
      domain: RESPOND,
      code: "RS.CO-05",
      title: "Public communication is coordinated during incidents",
      guidance:
        "Coordinate public communication about incidents through approved channels and spokespersons.",
    },
    {
      domain: RESPOND,
      code: "RS.MI-01",
      title: "Incidents are contained to prevent further damage",
      guidance:
        "Execute containment strategies to prevent further spread of the incident or damage.",
    },
    {
      domain: RESPOND,
      code: "RS.MI-02",
      title: "Incidents are eradicated from affected systems",
      guidance:
        "Eradicate malicious artifacts and remove adversary presence from affected systems.",
    },
    {
      domain: RESPOND,
      code: "RS.MI-03",
      title: "Affected systems are restored to a known good state",
      guidance:
        "Restore affected systems and data to a known good state using trusted sources and backups.",
    },

    // Recover (RC)
    {
      domain: RECOVER,
      code: "RC.RP-01",
      title:
        "Recovery plan is executed during or after a cybersecurity incident",
      guidance:
        "Execute the recovery plan during or after an incident to restore affected capabilities and services.",
    },
    {
      domain: RECOVER,
      code: "RC.RP-02",
      title: "Recovery actions are selected based on criteria and priorities",
      guidance:
        "Select recovery actions based on predefined criteria and organizational priorities.",
    },
    {
      domain: RECOVER,
      code: "RC.RP-03",
      title: "Recovery activities are verified for integrity",
      guidance:
        "Verify the integrity of backed-up data and restored assets before returning to production.",
    },
    {
      domain: RECOVER,
      code: "RC.RP-04",
      title: "Critical mission functions are restored",
      guidance:
        "Prioritize restoration of critical mission functions and business processes.",
    },
    {
      domain: RECOVER,
      code: "RC.RP-05",
      title: "Resource adequacy is ensured for recovery",
      guidance:
        "Ensure adequate resources are available to support recovery operations, including personnel and technology.",
    },
    {
      domain: RECOVER,
      code: "RC.RP-06",
      title:
        "Recovery activities are coordinated with internal and external parties",
      guidance:
        "Coordinate recovery activities with internal stakeholders and external service providers.",
    },
    {
      domain: RECOVER,
      code: "RC.CO-01",
      title: "Public relations and reputation are managed post-incident",
      guidance:
        "Manage public relations and organizational reputation following a cybersecurity incident.",
    },
    {
      domain: RECOVER,
      code: "RC.CO-02",
      title: "Reputation after an incident is repaired through communications",
      guidance:
        "Execute reputation repair communications strategy after a cybersecurity incident.",
    },
    {
      domain: RECOVER,
      code: "RC.CO-03",
      title: "Recovery activities are communicated to stakeholders",
      guidance:
        "Communicate recovery activities and progress to designated internal and external stakeholders.",
    },
    {
      domain: RECOVER,
      code: "RC.CO-04",
      title: "Lessons learned are shared with relevant stakeholders",
      guidance:
        "Share lessons learned from recovery activities with internal and external stakeholders.",
    },
    {
      domain: RECOVER,
      code: "RC.CO-05",
      title: "Updates are shared on cybersecurity strategy post-incident",
      guidance:
        "Share updates to cybersecurity risk management strategy and plans based on recovery lessons learned.",
    },
  ],
};
