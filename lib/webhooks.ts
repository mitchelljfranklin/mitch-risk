import { createHmac } from "node:crypto";

import {
  type WebhookEvent,
  type WebhookPlatform,
} from "../prisma/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type WebhookPayload = Record<string, unknown>;

const REQUEST_TIMEOUT_MS = 10_000;

// Runtime values mirrored from the Prisma enums so actions can validate
// formData without importing generated client internals at runtime.
export const WEBHOOK_EVENT_VALUES = [
  "ASSESSMENT_SUBMITTED",
  "ASSESSMENT_OVERDUE",
  "FINDING_CREATED",
  "FINDING_RESOLVED",
  "CERTIFICATION_EXPIRING",
] as const satisfies readonly WebhookEvent[];

export const WEBHOOK_PLATFORM_VALUES = [
  "GENERIC",
  "SLACK",
  "MICROSOFT_TEAMS",
  "DISCORD",
] as const satisfies readonly WebhookPlatform[];

// Admin-entered webhook URLs are fetched server-side by dispatchWebhook, so
// the target must be a public HTTPS address — otherwise the webhook feature
// becomes an SSRF pivot into whatever network the container sits on.
export function validateWebhookTarget(
  rawUrl: string,
): { ok: true } | { ok: false; reason: string } {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "Enter a valid URL." };
  }

  if (parsedUrl.protocol !== "https:") {
    return { ok: false, reason: "Webhook URLs must use HTTPS." };
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (isBlockedHostname(hostname)) {
    return {
      ok: false,
      reason:
        "Webhook URLs must point to a public address — internal and loopback hosts are not allowed.",
    };
  }

  return { ok: true };
}

function isBlockedHostname(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return true;
  }

  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(
    hostname,
  );
  if (ipv4Match) {
    const octets = ipv4Match.slice(1).map(Number) as [
      number,
      number,
      number,
      number,
    ];
    if (octets.some((octet) => octet > 255)) return true;
    const [first, second] = octets;
    if (first === 0 || first === 10 || first === 127) return true;
    if (first === 169 && second === 254) return true;
    if (first === 172 && second >= 16 && second <= 31) return true;
    if (first === 192 && second === 168) return true;
    return false;
  }

  // IPv6: loopback, link-local (fe80::/10), unique-local (fc00::/7).
  if (hostname === "::1" || hostname === "::") return true;
  if (/^f[cd]/.test(hostname)) return true;
  if (/^fe[89ab]/.test(hostname)) return true;

  return false;
}

const EVENT_LABELS: Record<string, string> = {
  ASSESSMENT_SUBMITTED: "Assessment submitted",
  ASSESSMENT_OVERDUE: "Assessment overdue",
  FINDING_CREATED: "Finding created",
  FINDING_RESOLVED: "Finding resolved",
  CERTIFICATION_EXPIRING: "Certification expiring",
};

function formatSlackMessage(
  event: WebhookEvent,
  payload: WebhookPayload,
): string {
  const title = EVENT_LABELS[event] ?? event;
  const fields: { title: string; value: string }[] = [];

  for (const [key, value] of Object.entries(payload)) {
    if (value != null && key !== "event" && key !== "timestamp") {
      const label = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (s) => s.toUpperCase());
      fields.push({ title: label, value: String(value) });
    }
  }

  return JSON.stringify({
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `:mega: ${title}`, emoji: true },
      },
      { type: "divider" },
      {
        type: "section",
        fields: fields.map((field) => ({
          type: "mrkdwn",
          text: `*${field.title}:*\n${field.value}`,
        })),
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `_Dispatched at ${new Date().toLocaleString()}_`,
          },
        ],
      },
    ],
  });
}

function formatTeamsMessage(
  event: WebhookEvent,
  payload: WebhookPayload,
): string {
  const title = EVENT_LABELS[event] ?? event;
  const facts = Object.entries(payload)
    .filter(([, value]) => value != null)
    .map(([key, value]) => {
      const label = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (s) => s.toUpperCase());
      return { name: label, value: String(value) };
    });

  return JSON.stringify({
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          type: "AdaptiveCard",
          version: "1.4",
          body: [
            {
              type: "TextBlock",
              text: title,
              weight: "bolder",
              size: "medium",
            },
            { type: "FactSet", facts },
          ],
        },
      },
    ],
  });
}

function formatDiscordMessage(
  event: WebhookEvent,
  payload: WebhookPayload,
): string {
  const title = EVENT_LABELS[event] ?? event;
  const fields = Object.entries(payload)
    .filter(([, value]) => value != null)
    .map(([key, value]) => {
      const label = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (s) => s.toUpperCase());
      return { name: label, value: String(value), inline: true };
    });

  return JSON.stringify({
    embeds: [
      {
        title,
        color: 3447003,
        fields,
        timestamp: new Date().toISOString(),
        footer: { text: "Mitch‑Risk" },
      },
    ],
  });
}

function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

async function deliverWebhook(
  url: string,
  secret: string,
  body: string,
  platform: WebhookPlatform,
): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const isGeneric = platform === "GENERIC";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (isGeneric) {
    headers["X-MitchRisk-Signature"] = `sha256=${signPayload(secret, body)}`;
    headers["X-MitchRisk-Event"] = "webhook";
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    console.error(`Webhook dispatch to ${url} failed`);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

const PLATFORM_FORMATTERS: Record<
  string,
  (event: WebhookEvent, payload: WebhookPayload) => string
> = {
  SLACK: formatSlackMessage,
  MICROSOFT_TEAMS: formatTeamsMessage,
  DISCORD: formatDiscordMessage,
};

export async function dispatchWebhook(
  event: WebhookEvent,
  payload: WebhookPayload,
): Promise<void> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { enabled: true, events: { has: event } },
  });

  if (endpoints.length === 0) return;

  for (const endpoint of endpoints) {
    const formatter = PLATFORM_FORMATTERS[endpoint.platform];
    const body = formatter
      ? formatter(event, payload)
      : JSON.stringify({
          event,
          timestamp: new Date().toISOString(),
          data: payload,
        });

    const delivered = await deliverWebhook(
      endpoint.url,
      endpoint.secret,
      body,
      endpoint.platform,
    );

    if (!delivered) {
      console.warn(
        `Webhook delivery failed for ${endpoint.url} (event: ${event})`,
      );
    }
  }
}
