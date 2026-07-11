import { createHmac } from "node:crypto";

import { type WebhookEvent } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type WebhookPayload = Record<string, unknown>;

const REQUEST_TIMEOUT_MS = 10_000;

function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

async function deliverWebhook(
  url: string,
  secret: string,
  body: string,
): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MitchRisk-Signature": `sha256=${signPayload(secret, body)}`,
        "X-MitchRisk-Event": "webhook",
      },
      body,
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function dispatchWebhook(
  event: WebhookEvent,
  payload: WebhookPayload,
): Promise<void> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { enabled: true, events: { has: event } },
  });

  if (endpoints.length === 0) return;

  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  for (const endpoint of endpoints) {
    const delivered = await deliverWebhook(endpoint.url, endpoint.secret, body);

    if (!delivered) {
      console.warn(
        `Webhook delivery failed for ${endpoint.url} (event: ${event})`,
      );
    }
  }
}
