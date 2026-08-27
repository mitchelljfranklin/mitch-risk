import { describe, expect, it } from "vitest";

import { buildVendorTimeline } from "@/lib/db/vendor-timeline";

const DAY = 86_400_000;

function utcDay(daysFromToday: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) +
      daysFromToday * DAY,
  );
}

describe("buildVendorTimeline", () => {
  it("merges heterogeneous events newest-first", () => {
    const timeline = buildVendorTimeline({
      vendorId: "v1",
      assessments: [
        {
          id: "a1",
          title: "Older assessment",
          status: "SENT",
          createdAt: new Date(1000),
          accessToken: null,
          submittedAt: null,
        },
        {
          id: "a2",
          title: "Newer assessment",
          status: "SUBMITTED",
          createdAt: new Date(5000),
          accessToken: "token-2",
          submittedAt: new Date(9000),
        },
      ],
      findings: [
        {
          id: "f1",
          title: "MFA not enforced",
          status: "REMEDIATED",
          createdAt: new Date(2000),
          resolvedAt: new Date(3000),
        },
      ],
      certifications: [
        {
          id: "c1",
          name: "SOC 2",
          issuedDate: null,
          expiresDate: null,
          createdAt: new Date(4000),
        },
      ],
    });

    const ids = timeline.map((event) => event.id);
    // Newest first across event types, with the submitted event (t=9000)
    // ahead of its own created event (t=5000).
    expect(ids[0]).toBe("assessment-submitted-a2");
    expect(ids[1]).toBe("assessment-created-a2");
    expect(ids).toContain("cert-created-c1");
    expect(ids).toContain("assessment-sent-a2");
    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i]!.createdAt.getTime()).toBeLessThanOrEqual(
        timeline[i - 1]!.createdAt.getTime(),
      );
    }
  });

  it("emits both created and sent when a portal link exists", () => {
    const timeline = buildVendorTimeline({
      vendorId: "v",
      assessments: [
        {
          id: "a1",
          title: "T",
          status: "SENT",
          createdAt: new Date(0),
          accessToken: "tok",
          submittedAt: null,
        },
      ],
      findings: [],
      certifications: [],
    });
    const actions = timeline.map((event) => event.action);
    // Both moments share the assessment's createdAt, so ordering between
    // them is insertion-stable; what matters is that both exist.
    expect([...actions].sort()).toEqual([
      "Assessment created",
      "Assessment sent",
    ]);
    expect(timeline.map((e) => e.id).sort()).toEqual([
      "assessment-created-a1",
      "assessment-sent-a1",
    ]);
  });

  it("labels closed findings by their terminal state", () => {
    const base = { createdAt: new Date(0), resolvedAt: new Date(10) };
    const timeline = buildVendorTimeline({
      vendorId: "v",
      assessments: [],
      findings: [
        {
          id: "fr",
          title: "R",
          status: "REMEDIATED",
          ...base,
        },
        {
          id: "fa",
          title: "A",
          status: "RISK_ACCEPTED",
          ...base,
        },
        { id: "fo", title: "O", status: "OPEN", ...base, resolvedAt: null },
      ],
      certifications: [],
    });

    const remediated = timeline.find((e) => e.id === "finding-updated-fr")!;
    const accepted = timeline.find((e) => e.id === "finding-updated-fa")!;
    expect(remediated.action).toBe("Remediated");
    expect(accepted.action).toBe("Risk accepted");
    // OPEN findings produce only their opening event.
    expect(timeline.some((e) => e.id === "finding-updated-fo")).toBe(false);
  });

  it("falls back to createdAt when no issue date exists", () => {
    const timeline = buildVendorTimeline({
      vendorId: "v",
      assessments: [],
      findings: [],
      certifications: [
        {
          id: "c1",
          name: "ISO 27001",
          issuedDate: null,
          expiresDate: null,
          createdAt: new Date(12345),
        },
      ],
    });
    expect(timeline[0]!.createdAt.getTime()).toBe(12345);
  });

  it("includes certs expiring within thirty days and excludes older horizons", () => {
    const expiringSoon = buildVendorTimeline({
      vendorId: "v",
      assessments: [],
      findings: [],
      certifications: [
        {
          id: "c-soon",
          name: "Expires in two weeks",
          issuedDate: null,
          expiresDate: utcDay(14),
          createdAt: utcDay(-90),
        },
      ],
    });
    expect(expiringSoon.some((e) => e.id === "cert-expiring-c-soon")).toBe(
      true,
    );

    const farFuture = buildVendorTimeline({
      vendorId: "v",
      assessments: [],
      findings: [],
      certifications: [
        {
          id: "c-far",
          name: "Expires next year",
          issuedDate: null,
          expiresDate: utcDay(200),
          createdAt: utcDay(-90),
        },
      ],
    });
    expect(farFuture.some((e) => e.id === "cert-expiring-c-far")).toBe(false);

    // An expiry window computed on server-local time previously shifted this
    // boundary by hours for deployments west of UTC.
    const edgeOfWindow = buildVendorTimeline({
      vendorId: "v",
      assessments: [],
      findings: [],
      certifications: [
        {
          id: "c-edge",
          name: "Exactly day 30 ahead",
          issuedDate: null,
          expiresDate: utcDay(30),
          createdAt: utcDay(-90),
        },
      ],
    });
    expect(edgeOfWindow.some((e) => e.id === "cert-expiring-c-edge")).toBe(
      true,
    );
  });
});
