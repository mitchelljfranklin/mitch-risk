import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getScoringSettings } from "@/lib/settings";
import { ScoringForm } from "../scoring-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Scoring" };

export default async function AdminScoringPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const scoring = await getScoringSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scoring</h1>
        <p className="text-muted-foreground text-sm">
          Risk weights and RAG cut-offs for vendor profiles and the heatmap.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scoring</CardTitle>
          <CardDescription>
            Risk weights and the red/amber/green cut‑offs used for vendor
            profiles and the gap heatmap.
          </CardDescription>
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
