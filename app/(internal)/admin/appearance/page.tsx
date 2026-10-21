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
import { getAppearanceSettings } from "@/lib/settings";
import { AppearanceForm } from "../appearance-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Admin.appearance");
  return { title: translations("metaTitle") };
}

export default async function AdminAppearancePage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.appearance");
  const appearance = await getAppearanceSettings();

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
          <AppearanceForm
            primaryHex={appearance.primaryHex}
            secondaryHex={appearance.secondaryHex}
            hasLogo={Boolean(appearance.logoKey)}
            logoKey={appearance.logoKey ?? ""}
            ragGreenHex={appearance.ragGreenHex}
            ragAmberHex={appearance.ragAmberHex}
            ragRedHex={appearance.ragRedHex}
            ragUnscoredHex={appearance.ragUnscoredHex}
            borderRadius={appearance.borderRadius}
            pageWidth={appearance.pageWidth}
          />
        </CardContent>
      </Card>
    </div>
  );
}
