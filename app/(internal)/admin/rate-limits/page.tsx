import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getAssessmentSettings } from "@/lib/settings";
import { RateLimitsForm } from "../rate-limits-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Rate limits" };

export default async function AdminRateLimitsPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const assessment = await getAssessmentSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rate limits</h1>
        <p className="text-muted-foreground text-sm">
          Abuse protection for the vendor portal and account recovery.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rate limits (per minute)</CardTitle>
          <CardDescription>
            Raise these for busy vendors or shared-office IPs; the defaults suit
            most deployments.
          </CardDescription>
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
