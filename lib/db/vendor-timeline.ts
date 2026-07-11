type TimelineEvent = {
  id: string;
  type: "assessment" | "finding" | "certification";
  action: string;
  description: string;
  createdAt: Date;
  link?: string;
};

export function buildVendorTimeline(args: {
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
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const assessment of args.assessments) {
    events.push({
      id: `assessment-created-${assessment.id}`,
      type: "assessment",
      action: "Assessment created",
      description: assessment.title,
      createdAt: assessment.createdAt,
      link: `/assessments/${assessment.id}`,
    });

    if (assessment.accessToken) {
      events.push({
        id: `assessment-sent-${assessment.id}`,
        type: "assessment",
        action: "Assessment sent",
        description: assessment.title,
        createdAt: assessment.createdAt,
        link: `/assessments/${assessment.id}`,
      });
    }

    if (assessment.submittedAt) {
      events.push({
        id: `assessment-submitted-${assessment.id}`,
        type: "assessment",
        action: "Assessment submitted",
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
      action: "Finding opened",
      description: finding.title,
      createdAt: finding.createdAt,
      link: `/risk-register`,
    });

    if (finding.status !== "OPEN" && finding.resolvedAt) {
      const label =
        finding.status === "REMEDIATED" ? "Remediated" : "Risk accepted";
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
      action: "Certification added",
      description: certification.name,
      createdAt: certDate,
    });

    if (certification.expiresDate) {
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      if (certification.expiresDate <= thirtyDays) {
        events.push({
          id: `cert-expiring-${certification.id}`,
          type: "certification",
          action: "Certification expiring",
          description: `${certification.name} — expires ${certification.expiresDate.toISOString().slice(0, 10)}`,
          createdAt: certification.expiresDate,
        });
      }
    }
  }

  events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return events.slice(0, 30);
}
