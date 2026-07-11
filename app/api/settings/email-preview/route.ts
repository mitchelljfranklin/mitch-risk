import { render } from "@react-email/components";
import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getEmailTemplateSettings } from "@/lib/settings";
import { getEmailTemplateDefinition } from "@/lib/settings/email-templates";
import { DynamicEmail } from "@/emails/dynamic";

function replaceTokens(text: string, tokens: Record<string, string>): string {
  return text.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => tokens[key] ?? `{{${key}}}`,
  );
}

export async function GET(request: Request) {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  revalidatePath("/settings", "page");

  const url = new URL(request.url);
  const templateType = url.searchParams.get("templateType");

  if (!templateType) {
    return new Response("templateType query param is required", {
      status: 400,
    });
  }

  const definition = getEmailTemplateDefinition(templateType);
  if (!definition) {
    return new Response("Unknown template type", { status: 400 });
  }

  const settings = await getEmailTemplateSettings();
  const rawSubject = String(
    settings[definition.subjectField] ?? definition.label,
  );
  const rawBody = String(
    settings[definition.bodyField] ??
      "This is a sample email body. Configure this template in Settings → Email.",
  );

  const sampleTokens: Record<string, string> = {
    vendorName: "Acme Logistics",
    assessmentTitle: "Annual security review",
    portalUrl: "https://mitch-risk.local/portal/sample-token",
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    reviewerName: "Internal reviewer",
    assessmentUrl: "https://mitch-risk.local/assessments/sample-id",
    portalPassword: "sample-password",
    message: "Please review these items and respond by the due date.",
    appName: "Mitch‑Risk",
    resetUrl: "https://mitch-risk.local/reset-password?token=sample-token",
    expiresIn: "24 hours",
    itemName: "SOC 2 Type II",
    expiresDate: new Date(Date.now() + 60 * 86400000)
      .toISOString()
      .slice(0, 10),
    vendorUrl: "https://mitch-risk.local/vendors/sample-id",
  };

  const heading = replaceTokens(rawSubject, sampleTokens);
  const bodyText = replaceTokens(rawBody, sampleTokens);

  try {
    const html = await render(
      DynamicEmail({
        heading,
        body: bodyText,
        htmlBody: bodyText,
      }),
    );

    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error(
      "Email preview render failed:",
      error instanceof Error ? error.message : String(error),
    );
    return new Response("Failed to render email preview", { status: 500 });
  }
}

export async function POST(request: Request) {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  revalidatePath("/settings", "page");

  let body: { templateType?: string; tokens?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { templateType, tokens = {} } = body;

  if (!templateType) {
    return new Response("templateType is required", { status: 400 });
  }

  const definition = getEmailTemplateDefinition(templateType);
  if (!definition) {
    return new Response("Unknown template type", { status: 400 });
  }

  const settings = await getEmailTemplateSettings();
  const rawSubject = String(
    settings[definition.subjectField] ?? definition.label,
  );
  const rawBody = String(
    settings[definition.bodyField] ??
      "This is a sample email body. Configure this template in Settings → Email.",
  );

  const sampleTokens: Record<string, string> = {
    vendorName: "Acme Logistics",
    assessmentTitle: "Annual security review",
    portalUrl: "https://mitch-risk.local/portal/sample-token",
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    reviewerName: "Internal reviewer",
    assessmentUrl: "https://mitch-risk.local/assessments/sample-id",
    portalPassword: "sample-password",
    message: "Please review these items and respond by the due date.",
    appName: "Mitch‑Risk",
    resetUrl: "https://mitch-risk.local/reset-password?token=sample-token",
    expiresIn: "24 hours",
    itemName: "SOC 2 Type II",
    expiresDate: new Date(Date.now() + 60 * 86400000)
      .toISOString()
      .slice(0, 10),
    vendorUrl: "https://mitch-risk.local/vendors/sample-id",
    ...tokens,
  };

  const heading = replaceTokens(rawSubject, sampleTokens);
  const bodyText = replaceTokens(rawBody, sampleTokens);

  try {
    const html = await render(
      DynamicEmail({
        heading,
        body: bodyText,
        htmlBody: bodyText,
      }),
    );

    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error(
      "Email preview render failed:",
      error instanceof Error ? error.message : String(error),
    );
    return new Response("Failed to render email preview", { status: 500 });
  }
}
