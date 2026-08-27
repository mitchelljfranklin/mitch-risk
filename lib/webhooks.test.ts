import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findManyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    webhookEndpoint: {
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
  },
}));

import {
  dispatchWebhook,
  validateWebhookTarget,
  WEBHOOK_EVENT_VALUES,
  WEBHOOK_PLATFORM_VALUES,
} from "@/lib/webhooks";

type CapturedRequest = {
  url: string;
  headers: Record<string, string>;
  body: string;
};

let fetchCalls: CapturedRequest[];
let fetchImpl: (url: string, init: RequestInit) => Promise<Response>;

beforeEach(() => {
  fetchCalls = [];
  fetchImpl = async (url, init) => {
    fetchCalls.push({
      url,
      headers: (init.headers ?? {}) as Record<string, string>,
      body: String(init.body ?? ""),
    });
    return { ok: true } as Response;
  };
  vi.stubGlobal("fetch", vi.fn(fetchImpl as never));
  findManyMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function enableEndpoints(
  endpoints: { platform: string; secret?: string; url?: string }[],
) {
  findManyMock.mockResolvedValue(
    endpoints.map((endpoint, index) => ({
      id: `wh-${index}`,
      name: "",
      url: endpoint.url ?? `https://hooks.example.test/${index}`,
      secret: endpoint.secret ?? "shared-secret-123",
      events: ["ASSESSMENT_SUBMITTED"],
      enabled: true,
      platform: endpoint.platform,
    })),
  );
}

describe("validateWebhookTarget", () => {
  it("accepts public HTTPS URLs", () => {
    expect(validateWebhookTarget("https://hooks.example.test/x")).toEqual({
      ok: true,
    });
  });

  it("rejects non-HTTPS schemes", () => {
    const result = validateWebhookTarget("http://hooks.example.test/x");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/HTTPS/i);
  });

  it.each([
    "https://localhost/hook",
    "https://127.0.0.1/hook",
    "http://10.1.2.3/hook",
    "https://192.168.0.5/hook",
    "https://172.16.4.4/hook",
    "https://172.31.255.1/hook",
    "https://169.254.169.254/latest/meta-data",
    "https://[::1]/hook",
    "https://fd00::1/hook",
    "https://fe80::1/hook",
    "https://my-service.internal/hook",
  ])("blocks internal target %s", (url) => {
    expect(validateWebhookTarget(url).ok).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(validateWebhookTarget("not-a-url").ok).toBe(false);
  });

  it("keeps the runtime enum lists in sync with the schema enums", () => {
    expect(WEBHOOK_EVENT_VALUES).toHaveLength(5);
    expect(WEBHOOK_PLATFORM_VALUES).toHaveLength(4);
  });
});

describe("dispatchWebhook", () => {
  const payload = {
    assessmentTitle: "Annual review",
    vendorName: null as unknown,
  };

  beforeEach(() => {
    payload.vendorName = null;
  });

  it("signs GENERIC payloads with the shared secret and ships the event envelope", async () => {
    enableEndpoints([{ platform: "GENERIC", secret: "shared-secret-123" }]);
    await dispatchWebhook("ASSESSMENT_SUBMITTED", payload);

    expect(fetchCalls).toHaveLength(1);
    const request = fetchCalls[0]!;
    const expectedDigest = createHmac("sha256", "shared-secret-123")
      .update(request.body)
      .digest("hex");
    expect(request.headers["X-MitchRisk-Signature"]).toBe(
      `sha256=${expectedDigest}`,
    );

    const body = JSON.parse(request.body) as {
      event: string;
      timestamp: string;
      data: Record<string, unknown>;
    };
    expect(body.event).toBe("ASSESSMENT_SUBMITTED");
    expect(body.timestamp).toBeTruthy();
    expect(body.data.assessmentTitle).toBe("Annual review");
  });

  it("never sends signature headers to chat platforms", async () => {
    enableEndpoints([{ platform: "SLACK" }]);
    await dispatchWebhook("ASSESSMENT_SUBMITTED", payload);

    expect(fetchCalls[0]!.headers["X-MitchRisk-Signature"]).toBeUndefined();
    const body = JSON.parse(fetchCalls[0]!.body) as { blocks: unknown[] };
    expect(Array.isArray(body.blocks)).toBe(true);
    // Nulls are filtered and camelCase keys become human labels.
    const serialised = fetchCalls[0]!.body;
    expect(serialised).toContain("Assessment Title");
    expect(serialised).not.toContain("vendorName");
  });

  it("formats Microsoft Teams adaptive cards and Discord embeds", async () => {
    enableEndpoints([{ platform: "MICROSOFT_TEAMS" }, { platform: "DISCORD" }]);
    await dispatchWebhook("FINDING_RESOLVED", { findingTitle: "Patch VPN" });

    const teams = JSON.parse(fetchCalls[0]!.body) as {
      attachments: [{ content: { type: string; body: { type: string }[] } }];
    };
    expect(teams.attachments[0].content.type).toBe("AdaptiveCard");

    const discord = JSON.parse(fetchCalls[1]!.body) as {
      embeds: [{ title: string; fields: { name: string }[] }];
    };
    expect(discord.embeds[0].title).toContain("Finding resolved");
    expect(discord.embeds[0].fields[0].name).toBe("Finding Title");
  });

  it("continues to later endpoints when an earlier delivery fails", async () => {
    enableEndpoints([
      { platform: "GENERIC", url: "https://first.example.test/hook" },
      { platform: "GENERIC", url: "https://second.example.test/hook" },
    ]);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | RequestInfo) => {
        if (String(url).includes("first")) {
          throw new Error("connection refused");
        }
        fetchCalls.push({
          url: String(url),
          headers: {},
          body: "",
        });
        return { ok: true } as Response;
      }) as never,
    );

    await dispatchWebhook("ASSESSMENT_SUBMITTED", payload);

    expect(fetchCalls.map((call) => call.url)).toEqual([
      "https://second.example.test/hook",
    ]);
  });
});
