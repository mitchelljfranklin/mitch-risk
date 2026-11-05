type TimelineEvent = {
  id: string;
  type: "assessment" | "finding" | "certification";
  action: string;
  description: string;
  createdAt: Date;
  link?: string;
};

type TimelineTranslate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

type TimelineOptions = {
  translate?: TimelineTranslate;
  formatDate?: (date: Date) => string;
};

const DEFAULT_ACTIONS: Record<string, string> = {
  assessmentCreated: "Assessment created",
  assessmentSent: "Assessment sent",
  assessmentSubmitted: "Assessment submitted",
  findingOpened: "Finding opened",
  remediated: "Remediated",
  riskAccepted: "Risk accepted",
  certificationAdded: "Certification added",
  certificationExpiring: "Certification expiring",
};

function defaultTranslate(key: string): string {
  return DEFAULT_ACTIONS[key] ?? key;
}

function defaultFormatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildVendorTimeline(
  args: {
    vendorId: string;
    assessments: {
      id: string;
      title: string;
      status: string;
      createdAt: Date;
      accessToken: string | null;
      submittedAt: Date | null;
    }[];
    findings: {
      id: string;
      title: string;
      status: string;
      createdAt: Date;
      resolvedAt: Date | null;
    }[];
    certifications: {
      id: string;
      name: string;
      issuedDate: Date | null;
      expiresDate: Date | null;
      createdAt: Date;
    }[];
  },
  options?: TimelineOptions,
): TimelineEvent[] {
  const translate = options?.translate ?? defaultTranslate;
  const formatDate = options?.formatDate ?? defaultFormatDate;
  const events: TimelineEvent[] = [];

  for (const assessment of args.assessments) {
    events.push({
      id: `assessment-created-${assessment.id}`,
      type: "assessment",
      action: translate("assessmentCreated"),
      description: assessment.title,
      createdAt: assessment.createdAt,
      link: `/assessments/${assessment.id}`,
    });

    if (assessment.accessToken) {
      events.push({
        id: `assessment-sent-${assessment.id}`,
        type: "assessment",
        action: translate("assessmentSent"),
        description: assessment.title,
        createdAt: assessment.createdAt,
        link: `/assessments/${assessment.id}`,
      });
    }

    if (assessment.submittedAt) {
      events.push({
        id: `assessment-submitted-${assessment.id}`,
        type: "assessment",
        action: translate("assessmentSubmitted"),
        description: assessment.title,
        createdAt: assessment.submittedAt,
        link: `/assessments/${assessment.id}`,
      });
    }
  }

  for (const finding of args.findings) {
    events.push({
      id: `finding-created-${finding.id}`,
      type: "finding",
      action: translate("findingOpened"),
      description: finding.title,
      createdAt: finding.createdAt,
      link: `/risk-register`,
    });

    if (finding.status !== "OPEN" && finding.resolvedAt) {
      const label =
        finding.status === "REMEDIATED"
          ? translate("remediated")
          : translate("riskAccepted");
      events.push({
        id: `finding-updated-${finding.id}`,
        type: "finding",
        action: label,
        description: finding.title,
        createdAt: finding.resolvedAt,
        link: `/risk-register`,
      });
    }
  }

  for (const certification of args.certifications) {
    const certDate = certification.issuedDate ?? certification.createdAt;
    events.push({
      id: `cert-created-${certification.id}`,
      type: "certification",
      action: translate("certificationAdded"),
      description: certification.name,
      createdAt: certDate,
    });

    if (certification.expiresDate) {
      // Expiry dates are stored as UTC-midnight instants; comparing them
      // against a server-local "+30 days" previously skewed the window near
      // month boundaries for deployments west of UTC.
      const nowUtc = new Date();
      const todayUtcStart = Date.UTC(
        nowUtc.getUTCFullYear(),
        nowUtc.getUTCMonth(),
        nowUtc.getUTCDate(),
      );
      const thirtyOneDayHorizon = todayUtcStart + 31 * 86_400_000;
      if (
        certification.expiresDate.getTime() > todayUtcStart &&
        certification.expiresDate.getTime() < thirtyOneDayHorizon
      ) {
        events.push({
          id: `cert-expiring-${certification.id}`,
          type: "certification",
          action: translate("certificationExpiring"),
          description: translate("certificationExpiringDescription", {
            name: certification.name,
            date: formatDate(certification.expiresDate),
          }),
          createdAt: certification.expiresDate,
        });
      }
    }
  }

  events.sort(
    (firstEvent, secondEvent) =>
      secondEvent.createdAt.getTime() - firstEvent.createdAt.getTime(),
  );

  return events.slice(0, 30);
}
