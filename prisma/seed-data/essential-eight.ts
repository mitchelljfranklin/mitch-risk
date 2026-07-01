import { type FrameworkSeed } from "./types";

const APP_CONTROL = "Application Control";
const PATCH_APPS = "Patch Applications";
const OFFICE_MACROS = "Microsoft Office Macros";
const USER_HARDENING = "User Application Hardening";
const ADMIN_RIGHTS = "Restrict Admin Privileges";
const PATCH_OS = "Patch Operating Systems";
const MFA = "Multi-Factor Authentication";
const BACKUPS = "Regular Backups";

export const essentialEight: FrameworkSeed = {
  name: "Essential Eight",
  version: "2024",
  description:
    "ASD Essential Eight Maturity Model (Australia) — 8 mitigation strategies across maturity levels 1–3, targeting commodity tradecraft through advanced tradecraft.",
  controls: [
    // Application Control
    {
      domain: APP_CONTROL,
      code: "E8.AC-01",
      title: "Application control is implemented on workstations (ML1)",
      guidance:
        "Implement application control to prevent execution of unapproved applications on workstations.",
    },
    {
      domain: APP_CONTROL,
      code: "E8.AC-02",
      title: "Application control is implemented on servers (ML1)",
      guidance:
        "Implement application control to prevent execution of unapproved applications on servers.",
    },
    {
      domain: APP_CONTROL,
      code: "E8.AC-03",
      title: "Application control rules are validated annually (ML1)",
      guidance:
        "Validate application control rules on an annual or more frequent basis.",
    },
    {
      domain: APP_CONTROL,
      code: "E8.AC-04",
      title: "Allowed/blocked execution events are centrally logged (ML2)",
      guidance:
        "Centrally log allowed and blocked application execution events for auditing and alerting.",
    },
    {
      domain: APP_CONTROL,
      code: "E8.AC-05",
      title: "Event logs are monitored for indicators of compromise (ML2)",
      guidance:
        "Monitor application control event logs for signs of compromise or policy violation.",
    },
    {
      domain: APP_CONTROL,
      code: "E8.AC-06",
      title: "Application control on workstations is driver-level (ML3)",
      guidance:
        "Implement application control using a combination of driver-level enforcement on workstations.",
    },
    {
      domain: APP_CONTROL,
      code: "E8.AC-07",
      title: "Application control on servers is driver-level (ML3)",
      guidance:
        "Implement application control using a combination of driver-level enforcement on servers.",
    },

    // Patch Applications
    {
      domain: PATCH_APPS,
      code: "E8.PA-01",
      title: "Automated asset discovery performed fortnightly (ML1)",
      guidance:
        "Use automated mechanisms to discover all applications on the network at least fortnightly.",
    },
    {
      domain: PATCH_APPS,
      code: "E8.PA-02",
      title: "Vulnerability scanner for online services runs daily (ML1)",
      guidance:
        "Use a vulnerability scanner to identify missing patches in internet-facing services daily.",
    },
    {
      domain: PATCH_APPS,
      code: "E8.PA-03",
      title: "Critical vulnerabilities patched within 48 hours (ML1)",
      guidance:
        "Apply patches for critical vulnerabilities in internet-facing services within 48 hours of release.",
    },
    {
      domain: PATCH_APPS,
      code: "E8.PA-04",
      title: "Other vulnerabilities patched within 2 weeks (ML1)",
      guidance:
        "Apply patches for other vulnerabilities in internet-facing services within 2 weeks of release.",
    },
    {
      domain: PATCH_APPS,
      code: "E8.PA-05",
      title: "Unsupported applications are removed (ML2)",
      guidance:
        "Remove applications no longer supported by vendors from the environment.",
    },
    {
      domain: PATCH_APPS,
      code: "E8.PA-06",
      title: "Vulnerability scanner runs weekly for internal apps (ML2)",
      guidance:
        "Use a vulnerability scanner to identify missing patches in internal applications at least weekly.",
    },
    {
      domain: PATCH_APPS,
      code: "E8.PA-07",
      title: "Critical patches deployed within 48 hours for all apps (ML3)",
      guidance:
        "Deploy patches for critical vulnerabilities across all applications within 48 hours.",
    },
    {
      domain: PATCH_APPS,
      code: "E8.PA-08",
      title:
        "All unsupported applications removed regardless of criticality (ML3)",
      guidance:
        "Remove all unsupported applications from the environment regardless of criticality.",
    },

    // Office Macros
    {
      domain: OFFICE_MACROS,
      code: "E8.OM-01",
      title: "Macros from the internet are blocked (ML1)",
      guidance:
        "Block Microsoft Office macros originating from the internet from executing.",
    },
    {
      domain: OFFICE_MACROS,
      code: "E8.OM-02",
      title:
        "Only digitally signed macros from trusted locations are allowed (ML1)",
      guidance:
        "Allow only digitally signed macros from trusted locations to execute in Microsoft Office.",
    },
    {
      domain: OFFICE_MACROS,
      code: "E8.OM-03",
      title:
        "Anti-malware scanning of macro-enabled Office files is performed (ML2)",
      guidance:
        "Enable anti-malware scanning of Microsoft Office files before they are opened.",
    },
    {
      domain: OFFICE_MACROS,
      code: "E8.OM-04",
      title: "Macro execution is logged and monitored (ML2)",
      guidance:
        "Log all macro execution events centrally and monitor for anomalous activity.",
    },
    {
      domain: OFFICE_MACROS,
      code: "E8.OM-05",
      title: "Macro execution is blocked for users not requiring it (ML3)",
      guidance:
        "Block all macro execution for users whose roles do not require them.",
    },
    {
      domain: OFFICE_MACROS,
      code: "E8.OM-06",
      title: "Macro execution allowed only in isolated environments (ML3)",
      guidance:
        "Allow macro execution only in isolated, controlled environments for users who genuinely need macros.",
    },

    // User Application Hardening
    {
      domain: USER_HARDENING,
      code: "E8.UH-01",
      title: "Web browsers are hardened (ML1)",
      guidance:
        "Apply vendor hardening guidance to all web browsers, disabling unnecessary features and plugins.",
    },
    {
      domain: USER_HARDENING,
      code: "E8.UH-02",
      title: "Microsoft Office is hardened (ML1)",
      guidance:
        "Apply vendor hardening guidance to Microsoft Office, including disabling Flash, OLE, and ActiveX.",
    },
    {
      domain: USER_HARDENING,
      code: "E8.UH-03",
      title: "PDF viewers and email clients are hardened (ML1)",
      guidance:
        "Apply vendor hardening guidance to PDF viewers and email clients used on workstations.",
    },
    {
      domain: USER_HARDENING,
      code: "E8.UH-04",
      title: ".NET Framework and PowerShell are hardened (ML2)",
      guidance:
        "Apply hardening to .NET Framework and PowerShell, including constrained language mode and logging.",
    },
    {
      domain: USER_HARDENING,
      code: "E8.UH-05",
      title: "Block web advertisements using browser extensions (ML2)",
      guidance:
        "Block web advertisements on workstations through browser features or extensions.",
    },
    {
      domain: USER_HARDENING,
      code: "E8.UH-06",
      title: "Attack Surface Reduction rules applied (ML3)",
      guidance:
        "Implement Microsoft Defender Attack Surface Reduction rules across all workstations.",
    },
    {
      domain: USER_HARDENING,
      code: "E8.UH-07",
      title: "Application Guard or equivalent containerisation used (ML3)",
      guidance:
        "Use Application Guard or equivalent containerisation for untrusted content such as email attachments.",
    },

    // Restrict Admin Privileges
    {
      domain: ADMIN_RIGHTS,
      code: "E8.AP-01",
      title: "Admin accounts are used only for administrative tasks (ML1)",
      guidance:
        "Ensure privileged accounts are used only for administrative tasks and separate from standard user accounts.",
    },
    {
      domain: ADMIN_RIGHTS,
      code: "E8.AP-02",
      title: "Privileged access is regularly audited (ML1)",
      guidance:
        "Audit privileged access events at least annually, including membership of privileged groups.",
    },
    {
      domain: ADMIN_RIGHTS,
      code: "E8.AP-03",
      title:
        "Privileged accounts are prevented from accessing internet and email (ML2)",
      guidance:
        "Prevent privileged accounts from accessing the internet, email, and web services on workstations.",
    },
    {
      domain: ADMIN_RIGHTS,
      code: "E8.AP-04",
      title: "Just-in-time administration is used (ML2)",
      guidance:
        "Implement just-in-time administration for all privileged access where feasible.",
    },
    {
      domain: ADMIN_RIGHTS,
      code: "E8.AP-05",
      title: "Privileged access is logged and alerted (ML2)",
      guidance:
        "Log all privileged access events centrally and generate alerts for anomalous usage.",
    },
    {
      domain: ADMIN_RIGHTS,
      code: "E8.AP-06",
      title: "Privileged access workflows require change requests (ML3)",
      guidance:
        "Require formal change requests and approvals for all privileged access grants.",
    },
    {
      domain: ADMIN_RIGHTS,
      code: "E8.AP-07",
      title: "Break-glass accounts are monitored in real time (ML3)",
      guidance:
        "Monitor break-glass and emergency admin account usage in real time with immediate alerting.",
    },

    // Patch Operating Systems
    {
      domain: PATCH_OS,
      code: "E8.PO-01",
      title: "Automated OS asset discovery performed fortnightly (ML1)",
      guidance:
        "Use automated mechanisms to discover all operating systems on the network at least fortnightly.",
    },
    {
      domain: PATCH_OS,
      code: "E8.PO-02",
      title: "Critical OS patches applied within 48 hours (ML1)",
      guidance:
        "Apply critical operating system patches for internet-facing services within 48 hours of release.",
    },
    {
      domain: PATCH_OS,
      code: "E8.PO-03",
      title: "Other OS patches applied within 2 weeks (ML1)",
      guidance:
        "Apply other operating system patches for internet-facing services within 2 weeks of release.",
    },
    {
      domain: PATCH_OS,
      code: "E8.PO-04",
      title: "Unsupported OS versions are removed (ML2)",
      guidance:
        "Remove operating systems no longer supported by vendors from the environment.",
    },
    {
      domain: PATCH_OS,
      code: "E8.PO-05",
      title: "OS vulnerability scans run weekly for internal systems (ML2)",
      guidance:
        "Use a vulnerability scanner to identify missing OS patches in internal systems at least weekly.",
    },
    {
      domain: PATCH_OS,
      code: "E8.PO-06",
      title:
        "Critical OS patches deployed within 48 hours for all systems (ML3)",
      guidance:
        "Deploy critical operating system patches across all systems within 48 hours of release.",
    },
    {
      domain: PATCH_OS,
      code: "E8.PO-07",
      title: "All unsupported OS versions are removed (ML3)",
      guidance:
        "Remove all unsupported operating systems from the environment regardless of criticality.",
    },

    // Multi-Factor Authentication
    {
      domain: MFA,
      code: "E8.MF-01",
      title: "MFA enforced for all users for internet-facing services (ML1)",
      guidance:
        "Enforce multi-factor authentication for all users when accessing internet-facing services.",
    },
    {
      domain: MFA,
      code: "E8.MF-02",
      title: "MFA uses phishing-resistant methods where possible (ML2)",
      guidance:
        "Use phishing-resistant multi-factor authentication methods such as FIDO2 security keys or certificate-based auth.",
    },
    {
      domain: MFA,
      code: "E8.MF-03",
      title: "MFA enforced for all services including internal (ML2)",
      guidance:
        "Enforce multi-factor authentication for all users accessing all services, including internal networks.",
    },
    {
      domain: MFA,
      code: "E8.MF-04",
      title: "MFA bypass or exception processes are logged and reviewed (ML2)",
      guidance:
        "Log all MFA bypass and exception requests centrally and review regularly.",
    },
    {
      domain: MFA,
      code: "E8.MF-05",
      title:
        "MFA is phishing-resistant for all privileged and remote users (ML3)",
      guidance:
        "Require phishing-resistant MFA for all privileged users and all remote access scenarios.",
    },
    {
      domain: MFA,
      code: "E8.MF-06",
      title: "MFA events are monitored for anomalous patterns (ML3)",
      guidance:
        "Monitor MFA events centrally for anomalous usage patterns indicative of token theft or bypass.",
    },

    // Regular Backups
    {
      domain: BACKUPS,
      code: "E8.BU-01",
      title: "Backups of important data are performed regularly (ML1)",
      guidance:
        "Perform regular backups of all important data, software, and configuration settings.",
    },
    {
      domain: BACKUPS,
      code: "E8.BU-02",
      title: "Backup integrity is verified periodically (ML1)",
      guidance:
        "Verify the integrity, completeness, and restorability of backups on a regular schedule.",
    },
    {
      domain: BACKUPS,
      code: "E8.BU-03",
      title: "Backups are stored offline or in an isolated network (ML2)",
      guidance:
        "Store critical backups offline, in an air-gapped environment, or in an isolated network separate from production.",
    },
    {
      domain: BACKUPS,
      code: "E8.BU-04",
      title: "Backup access is restricted to privileged accounts (ML2)",
      guidance:
        "Restrict access to backup systems and backup data to specifically authorized privileged accounts.",
    },
    {
      domain: BACKUPS,
      code: "E8.BU-05",
      title: "Backup restoration is tested in a recovery exercise (ML2)",
      guidance:
        "Test restoration of backups in a recovery exercise at least annually.",
    },
    {
      domain: BACKUPS,
      code: "E8.BU-06",
      title: "Immutable backups are maintained (ML3)",
      guidance:
        "Maintain immutable copies of backups that cannot be altered or deleted after creation.",
    },
    {
      domain: BACKUPS,
      code: "E8.BU-07",
      title: "Real-time replication to isolated environment is used (ML3)",
      guidance:
        "Use real-time or near-real-time replication of critical data to an isolated backup environment.",
    },
  ],
};
