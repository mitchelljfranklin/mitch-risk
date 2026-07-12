import { createHmac } from "node:crypto";

import {
  type WebhookEvent,
  type WebhookPlatform,
} from "../prisma/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type WebhookPayload = Record<string, unknown>;

const REQUEST_TIMEOUT_MS = 10_000;

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
