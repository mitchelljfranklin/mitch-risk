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
import { getAssessmentSettings } from "@/lib/settings";
import { RateLimitsForm } from "../rate-limits-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Admin.rateLimits");
  return { title: translations("metaTitle") };
}

export default async function AdminRateLimitsPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.rateLimits");
  const assessment = await getAssessmentSettings();

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
          <RateLimitsForm
            portalPageLoadsPerMin={assessment.portalPageLoadsPerMin}
            portalUploadsPerMin={assessment.portalUploadsPerMin}
            portalSubmitPerMin={assessment.portalSubmitPerMin}
            portalCommentPerMin={assessment.portalCommentPerMin}
            portalPasswordAttemptsPerMin={
              assessment.portalPasswordAttemptsPerMin
            }
            passwordResetPerMin={assessment.passwordResetPerMin}
            breakGlassPerMin={assessment.breakGlassPerMin}
          />
        </CardContent>
      </Card>
    </div>
  );
}
