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
import { getScoringSettings } from "@/lib/settings";
import { ScoringForm } from "../scoring-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Admin.scoring");
  return { title: translations("metaTitle") };
}

export default async function AdminScoringPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.scoring");
  const scoring = await getScoringSettings();

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
          <ScoringForm
            riskWeightCritical={scoring?.riskWeights.CRITICAL ?? 10}
            riskWeightHigh={scoring?.riskWeights.HIGH ?? 6}
            riskWeightMedium={scoring?.riskWeights.MEDIUM ?? 3}
            riskWeightLow={scoring?.riskWeights.LOW ?? 1}
            ragAmber={scoring?.ragThresholds.amber ?? 0.6}
            ragGreen={scoring?.ragThresholds.green ?? 0.85}
          />
        </CardContent>
      </Card>
    </div>
  );
}
