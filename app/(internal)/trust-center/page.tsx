import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getTrustCenterSettings } from "@/lib/settings";
import {
  listTrustCenterBadges,
  listTrustCenterDocuments,
  listTrustCenterSections,
  listTrustCenterSubprocessors,
} from "@/lib/db/trust-center";

import { BadgesManager } from "@/components/trust-center/badges-manager";
import { DocumentsManager } from "@/components/trust-center/documents-manager";
import { SectionsManager } from "@/components/trust-center/sections-manager";
import { SubprocessorsManager } from "@/components/trust-center/subprocessors-manager";

export async function generateMetadata() {
  const translations = await getTranslations("TrustCenterManager");
  return { title: translations("metaTitle") };
}

export default async function TrustCenterPage() {
  await requirePermission(PERMISSIONS.TRUSTCENTER_MANAGE);
  const translations = await getTranslations("TrustCenterManager");

  const [badges, documents, subprocessors, sections, settings] =
    await Promise.all([
      listTrustCenterBadges(),
      listTrustCenterDocuments(),
      listTrustCenterSubprocessors(),
      listTrustCenterSections(),
      getTrustCenterSettings(),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {translations("title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {translations("subtitle")}
          </p>
        </div>
        {settings.enabled ? (
          <Button asChild variant="outline" size="sm">
            <Link href="/trust" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              {translations("viewPublic")}
            </Link>
          </Button>
        ) : null}
      </div>

      {!settings.enabled ? (
        <div className="border-warning/50 bg-warning/10 rounded-md border px-4 py-3 text-sm">
          {translations("disabledBanner")}
        </div>
      ) : null}

      <BadgesManager badges={badges} />
      <DocumentsManager documents={documents} />
      <SubprocessorsManager subprocessors={subprocessors} />
      <SectionsManager sections={sections} />
    </div>
  );
}
