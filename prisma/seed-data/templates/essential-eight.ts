import { type TemplateSeed } from "../types";
import { frequencyQuestion, yesNoQuestion } from "./helpers";

export const essentialEightFullTemplate: TemplateSeed = {
  id: "full-essential-eight",
  name: "Essential Eight Full",
  description:
    "Complete self-assessment questionnaire covering all 55 ASD Essential Eight controls across the eight mitigation strategies and maturity levels.",
  frameworkName: "Essential Eight",
  sections: [
    {
      title: "Application Control",
      questions: [
        yesNoQuestion(
          "Is application control implemented on workstations to prevent execution of unapproved applications?",
          "E8.AC-01",
          "CRITICAL",
        ),
        yesNoQuestion(
          "Is application control implemented on servers to prevent execution of unapproved applications?",
          "E8.AC-02",
          "CRITICAL",
        ),
        yesNoQuestion(
          "Are application control rules validated at least annually?",
          "E8.AC-03",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Are allowed and blocked application execution events centrally logged?",
          "E8.AC-04",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Are application control event logs monitored for indicators of compromise?",
          "E8.AC-05",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Is application control on workstations enforced at the driver level?",
          "E8.AC-06",
          "HIGH",
        ),
        yesNoQuestion(
          "Is application control on servers enforced at the driver level?",
          "E8.AC-07",
          "HIGH",
        ),
      ],
    },
    {
      title: "Patch Applications",
      questions: [
        yesNoQuestion(
          "Is automated asset discovery performed at least fortnightly for all applications?",
          "E8.PA-01",
          "HIGH",
        ),
        yesNoQuestion(
          "Is a vulnerability scanner used daily to identify missing patches in internet-facing services?",
          "E8.PA-02",
          "HIGH",
        ),
        yesNoQuestion(
          "Are critical vulnerabilities in internet-facing services patched within 48 hours of release?",
          "E8.PA-03",
          "CRITICAL",
        ),
        yesNoQuestion(
          "Are other vulnerabilities in internet-facing services patched within 2 weeks of release?",
          "E8.PA-04",
          "HIGH",
        ),
        yesNoQuestion(
          "Are applications no longer supported by vendors removed from your environment?",
          "E8.PA-05",
          "HIGH",
        ),
        yesNoQuestion(
          "Is a vulnerability scanner run at least weekly to identify missing patches in internal applications?",
          "E8.PA-06",
          "HIGH",
        ),
        yesNoQuestion(
          "Are critical vulnerabilities across all applications patched within 48 hours of release?",
          "E8.PA-07",
          "HIGH",
        ),
        yesNoQuestion(
          "Are all unsupported applications removed regardless of criticality?",
          "E8.PA-08",
          "HIGH",
        ),
      ],
    },
    {
      title: "Microsoft Office Macros",
      questions: [
        yesNoQuestion(
          "Are Microsoft Office macros originating from the internet blocked from executing?",
          "E8.OM-01",
          "CRITICAL",
        ),
        yesNoQuestion(
          "Are only digitally signed macros from trusted locations allowed to execute?",
          "E8.OM-02",
          "HIGH",
        ),
        yesNoQuestion(
          "Is anti-malware scanning of macro-enabled Office files performed before they are opened?",
          "E8.OM-03",
          "HIGH",
        ),
        yesNoQuestion(
          "Are macro execution events centrally logged and monitored for anomalous activity?",
          "E8.OM-04",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Is macro execution blocked for users whose roles do not require it?",
          "E8.OM-05",
          "HIGH",
        ),
        yesNoQuestion(
          "Is macro execution allowed only in isolated, controlled environments?",
          "E8.OM-06",
          "HIGH",
        ),
      ],
    },
    {
      title: "User Application Hardening",
      questions: [
        yesNoQuestion(
          "Are web browsers hardened in accordance with vendor guidance?",
          "E8.UH-01",
          "HIGH",
        ),
        yesNoQuestion(
          "Is Microsoft Office hardened per vendor guidance (Flash, OLE, and ActiveX disabled)?",
          "E8.UH-02",
          "HIGH",
        ),
        yesNoQuestion(
          "Are PDF viewers and email clients hardened in accordance with vendor guidance?",
          "E8.UH-03",
          "HIGH",
        ),
        yesNoQuestion(
          "Are .NET Framework and PowerShell hardened, including constrained language mode and logging?",
          "E8.UH-04",
          "HIGH",
        ),
        yesNoQuestion(
          "Are web advertisements blocked on workstations via browser features or extensions?",
          "E8.UH-05",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Are Microsoft Defender Attack Surface Reduction rules applied across workstations?",
          "E8.UH-06",
          "HIGH",
        ),
        yesNoQuestion(
          "Is Application Guard or equivalent containerisation used for untrusted content?",
          "E8.UH-07",
          "HIGH",
        ),
      ],
    },
    {
      title: "Restrict Admin Privileges",
      questions: [
        yesNoQuestion(
          "Are privileged accounts used only for administrative tasks and separated from standard user accounts?",
          "E8.AP-01",
          "CRITICAL",
        ),
        frequencyQuestion(
          "How often is privileged access audited?",
          "E8.AP-02",
          "MEDIUM",
          ["Monthly", "Quarterly", "Annually", "Ad-hoc", "Never"],
          ["Monthly", "Quarterly", "Annually"],
        ),
        yesNoQuestion(
          "Are privileged accounts prevented from accessing the internet, email, and web services?",
          "E8.AP-03",
          "CRITICAL",
        ),
        yesNoQuestion(
          "Is just-in-time administration used for privileged access where feasible?",
          "E8.AP-04",
          "HIGH",
        ),
        yesNoQuestion(
          "Are privileged access events centrally logged with alerts for anomalous usage?",
          "E8.AP-05",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Are formal change requests and approvals required for privileged access grants?",
          "E8.AP-06",
          "HIGH",
        ),
        yesNoQuestion(
          "Are break-glass and emergency admin accounts monitored in real time with alerting?",
          "E8.AP-07",
          "HIGH",
        ),
      ],
    },
    {
      title: "Patch Operating Systems",
      questions: [
        yesNoQuestion(
          "Is automated asset discovery performed at least fortnightly for all operating systems?",
          "E8.PO-01",
          "HIGH",
        ),
        yesNoQuestion(
          "Are critical operating system patches applied within 48 hours for internet-facing services?",
          "E8.PO-02",
          "CRITICAL",
        ),
        yesNoQuestion(
          "Are other operating system patches applied within 2 weeks for internet-facing services?",
          "E8.PO-03",
          "HIGH",
        ),
        yesNoQuestion(
          "Are operating systems no longer supported by vendors removed from your environment?",
          "E8.PO-04",
          "HIGH",
        ),
        yesNoQuestion(
          "Are OS vulnerability scans run at least weekly for internal systems?",
          "E8.PO-05",
          "HIGH",
        ),
        yesNoQuestion(
          "Are critical operating system patches deployed within 48 hours across all systems?",
          "E8.PO-06",
          "HIGH",
        ),
        yesNoQuestion(
          "Are all unsupported operating systems removed regardless of criticality?",
          "E8.PO-07",
          "HIGH",
        ),
      ],
    },
    {
      title: "Multi-Factor Authentication",
      questions: [
        yesNoQuestion(
          "Is multi-factor authentication enforced for all users accessing internet-facing services?",
          "E8.MF-01",
          "CRITICAL",
        ),
        yesNoQuestion(
          "Are phishing-resistant MFA methods (FIDO2, certificate-based) used where possible?",
          "E8.MF-02",
          "HIGH",
        ),
        yesNoQuestion(
          "Is multi-factor authentication enforced for all services, including internal networks?",
          "E8.MF-03",
          "CRITICAL",
        ),
        yesNoQuestion(
          "Are MFA bypass and exception requests logged centrally and reviewed regularly?",
          "E8.MF-04",
          "MEDIUM",
        ),
        yesNoQuestion(
          "Is phishing-resistant MFA required for all privileged users and remote access?",
          "E8.MF-05",
          "CRITICAL",
        ),
        yesNoQuestion(
          "Are MFA events monitored centrally for anomalous patterns indicating token theft or bypass?",
          "E8.MF-06",
          "MEDIUM",
        ),
      ],
    },
    {
      title: "Regular Backups",
      questions: [
        frequencyQuestion(
          "How often are backups of important data, software, and configuration performed?",
          "E8.BU-01",
          "CRITICAL",
          ["Daily", "Weekly", "Monthly", "Less often", "Never"],
          ["Daily", "Weekly", "Monthly"],
        ),
        frequencyQuestion(
          "How often is the integrity and restorability of backups verified?",
          "E8.BU-02",
          "HIGH",
          ["Weekly", "Monthly", "Quarterly", "Annually", "Never"],
          ["Weekly", "Monthly", "Quarterly"],
        ),
        yesNoQuestion(
          "Are critical backups stored offline, air-gapped, or in an isolated network?",
          "E8.BU-03",
          "HIGH",
        ),
        yesNoQuestion(
          "Is access to backup systems and backup data restricted to authorized privileged accounts?",
          "E8.BU-04",
          "HIGH",
        ),
        yesNoQuestion(
          "Is backup restoration tested in a recovery exercise at least annually?",
          "E8.BU-05",
          "HIGH",
        ),
        yesNoQuestion(
          "Are immutable copies of backups maintained that cannot be altered or deleted after creation?",
          "E8.BU-06",
          "CRITICAL",
        ),
        yesNoQuestion(
          "Is real-time or near-real-time replication of critical data used to an isolated environment?",
          "E8.BU-07",
          "HIGH",
        ),
      ],
    },
  ],
};
