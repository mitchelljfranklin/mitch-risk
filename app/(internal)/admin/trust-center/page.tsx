import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getTrustCenterSettings } from "@/lib/settings";
import { TrustCenterSettingsForm } from "../trust-center-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Admin.trustCenter");
  return { title: translations("metaTitle") };
}

export default async function AdminTrustCenterPage() {
  await requirePermission(PERMISSIONS.TRUSTCENTER_MANAGE);
  const translations = await getTranslations("Admin.trustCenter");
  const trustCenter = await getTrustCenterSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {translations("title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {translations("subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{translations("cardTitle")}</CardTitle>
          <CardDescription>{translations("cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <TrustCenterSettingsForm
            enabled={trustCenter.enabled}
            intro={trustCenter.intro}
            contactEmail={trustCenter.contactEmail}
            includeInInvites={trustCenter.includeInInvites}
            pageLoadsPerMin={trustCenter.pageLoadsPerMin}
            downloadsPerMin={trustCenter.downloadsPerMin}
          />
        </CardContent>
      </Card>
    </div>
  );
}
