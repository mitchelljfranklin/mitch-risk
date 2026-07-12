import {
  type WebhookEndpoint,
  type WebhookEvent,
  type WebhookPlatform,
} from "../../prisma/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export type WebhookEndpointSummary = Pick<
  WebhookEndpoint,
  "id" | "name" | "url" | "enabled" | "events" | "platform" | "createdAt"
>;

export function listWebhookEndpoints(): Promise<WebhookEndpointSummary[]> {
  return prisma.webhookEndpoint.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      url: true,
      enabled: true,
      events: true,
      platform: true,
      createdAt: true,
    },
  });
}

export function createWebhookEndpoint(data: {
  url: string;
  name: string;
  secret: string;
  events: WebhookEvent[];
  platform: WebhookPlatform;
}): Promise<WebhookEndpoint> {
  return prisma.webhookEndpoint.create({ data });
}

export function deleteWebhookEndpoint(id: string): Promise<WebhookEndpoint> {
  return prisma.webhookEndpoint.delete({ where: { id } });
}

export function toggleWebhookEndpoint(
  id: string,
  enabled: boolean,
): Promise<WebhookEndpoint> {
  return prisma.webhookEndpoint.update({
    where: { id },
    data: { enabled },
  });
}
