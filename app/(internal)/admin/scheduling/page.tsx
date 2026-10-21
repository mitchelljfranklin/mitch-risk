import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getAssessmentSettings, getCronSettings } from "@/lib/settings";
import { SchedulingForm } from "../scheduling-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Admin.scheduling");
  return { title: translations("metaTitle") };
}

export default async function AdminSchedulingPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.scheduling");

  const [assessment, cronLastRunRow, cronSettings] = await Promise.all([
    getAssessmentSettings(),
    prisma.appSetting.findUnique({ where: { key: "cron.lastRun" } }),
    getCronSettings(),
  ]);
  const cronLastRun =
    cronLastRunRow && typeof cronLastRunRow.value === "string"
      ? cronLastRunRow.value
      : null;

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
          <SchedulingForm
            reminderOffsetDays={assessment.reminderOffsetDays}
            escalationAfterDays={assessment.escalationAfterDays}
            defaultDueInDays={assessment.defaultDueInDays}
            cronLastRun={cronLastRun}
            internalSchedulerEnabled={cronSettings.internalSchedulerEnabled}
          />
        </CardContent>
      </Card>
    </div>
  );
}
