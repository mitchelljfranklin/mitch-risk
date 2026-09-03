import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { marked } from "marked";

import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import {
  getAppearanceSettings,
  getOrganizationSettings,
  getTrustCenterSettings,
} from "@/lib/settings";
import {
  listPublishedTrustCenterBadges,
  listPublishedTrustCenterDocuments,
  listPublishedTrustCenterSections,
  listPublishedTrustCenterSubprocessors,
} from "@/lib/db/trust-center";
import { TRUST_CENTER_DOCUMENT_CATEGORY_LABELS } from "@/lib/schemas/trust-center";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

// Escape HTML before markdown parsing: raw tags in admin-authored content
// render as visible text, and the only generated markup is marked's own.
function renderMarkdown(markdown: string): string {
  const escaped = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return marked.parse(escaped, { async: false }) as string;
}

export default async function TrustCenterPublicPage() {
  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);
  const settings = await getTrustCenterSettings();

  // Disabled leaves no trace: same neutral 404 a wrong URL would get.
  if (!settings.enabled) notFound();
  if (!rateLimit("trust-page", clientIp, settings.pageLoadsPerMin)) notFound();

  const [org, appearance, badges, documents, subprocessors, sections] =
    await Promise.all([
      getOrganizationSettings(),
      getAppearanceSettings(),
      listPublishedTrustCenterBadges(),
      listPublishedTrustCenterDocuments(),
      listPublishedTrustCenterSubprocessors(),
      listPublishedTrustCenterSections(),
    ]);

  const contactEmail = settings.contactEmail || org.supportEmail;
  return (
    <div className="bg-background min-h-svh">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col items-center gap-3 text-center">
          {appearance.logoKey ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/brand/logo?v=${appearance.logoKey}`}
              alt={org.name}
              className="h-16 w-auto"
            />
          ) : (
            <ShieldCheck className="text-muted-foreground size-10" />
          )}
          <h1 className="text-3xl font-semibold tracking-tight">
            {org.name} Trust Center
          </h1>
          {settings.intro ? (
            <div
              className="text-muted-foreground text-sm"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(settings.intro),
              }}
            />
          ) : null}
        </header>

        {badges.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">
              Compliance &amp; certifications
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {badges.map((badge) => {
                return (
                  <div
                    key={badge.id}
                    className="flex items-start gap-3 rounded-lg border p-4"
                  >
                    {badge.imageKey ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/trust/badges/${badge.id}/image?v=${badge.imageKey}`}
                        alt={`${badge.title} badge`}
                        className="size-12 shrink-0 object-contain"
                      />
                    ) : (
                      <ShieldCheck className="text-muted-foreground size-8 shrink-0" />
                    )}
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {badge.title}
                        </span>
                        {badge.expired ? (
                          <Badge variant="secondary" className="text-xs">
                            Expired
                          </Badge>
                        ) : badge.expiringSoon ? (
                          <Badge variant="secondary" className="text-xs">
                            Expiring soon
                          </Badge>
                        ) : null}
                      </div>
                      {badge.issuer ? (
                        <p className="text-muted-foreground text-xs">
                          {badge.issuer}
                        </p>
                      ) : null}
                      {badge.description ? (
                        <p className="text-muted-foreground text-xs">
                          {badge.description}
                        </p>
                      ) : null}
                      {badge.externalUrl ? (
                        <a
                          href={badge.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs underline"
                        >
                          Verify
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {documents.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Security documents</h2>
            <div className="flex flex-col divide-y rounded-lg border">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {document.title}
                    </p>
                    {document.description ? (
                      <p className="text-muted-foreground truncate text-xs">
                        {document.description}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground truncate text-xs">
                      {TRUST_CENTER_DOCUMENT_CATEGORY_LABELS[
                        document.category
                      ] ?? document.category}
                      {document.file
                        ? ` · ${(document.file.sizeBytes / 1024).toFixed(0)} KB`
                        : ""}
                    </p>
                  </div>
                  {document.file ? (
                    <a
                      href={`/api/trust/documents/${document.id}`}
                      className="text-sm underline"
                      download={document.file.fileName}
                    >
                      Download
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {subprocessors.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Subprocessors</h2>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b text-left">
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Purpose</th>
                    <th className="px-4 py-2 font-medium">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {subprocessors.map((subprocessor) => (
                    <tr
                      key={subprocessor.id}
                      className="border-b last:border-b-0"
                    >
                      <td className="px-4 py-2">
                        {subprocessor.websiteUrl ? (
                          <a
                            href={subprocessor.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            {subprocessor.name}
                          </a>
                        ) : (
                          subprocessor.name
                        )}
                      </td>
                      <td className="text-muted-foreground px-4 py-2">
                        {subprocessor.purpose}
                      </td>
                      <td className="text-muted-foreground px-4 py-2">
                        {subprocessor.location}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {sections.map((section) => (
          <section key={section.id} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <div
              className="text-sm [&_a]:underline [&_li]:ml-4 [&_ol]:list-decimal [&_p]:my-2 [&_ul]:list-disc"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(section.body),
              }}
            />
          </section>
        ))}

        {contactEmail ? (
          <footer className="text-muted-foreground mt-4 border-t pt-6 text-center text-sm">
            Questions about our security posture?{" "}
            <a href={`mailto:${contactEmail}`} className="underline">
              {contactEmail}
            </a>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
