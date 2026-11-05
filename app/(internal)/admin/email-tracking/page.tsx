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
import { getEmailLogRetention } from "@/lib/settings";
import { listEmailLogs } from "@/lib/db/notifications";
import { buildFilterQueryString } from "@/lib/nav";
import { EmailTrackingForm } from "../email-tracking";
import { RetentionForm } from "../retention-form";
import { saveEmailLogRetentionSettings } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Admin.emailTracking");
  return { title: translations("metaTitle") };
}

export default async function AdminEmailTrackingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.emailTracking");
  const searchParameters = await searchParams;

  const [emailLogs, emailLogRetention] = await Promise.all([
    listEmailLogs({
      status: searchParameters.status,
      type: searchParameters.type,
      recipient: searchParameters.recipient,
      fromDate: searchParameters.fromDate,
      toDate: searchParameters.toDate,
      page: searchParameters.emailLogPage
        ? parseInt(searchParameters.emailLogPage)
        : 1,
      pageSize: searchParameters.emailLogPageSize
        ? parseInt(searchParameters.emailLogPageSize)
        : undefined,
    }),
    getEmailLogRetention(),
  ]);

  const emailFilterQuery = buildFilterQueryString({
    status: searchParameters.status,
    type: searchParameters.type,
    recipient: searchParameters.recipient,
    fromDate: searchParameters.fromDate,
    toDate: searchParameters.toDate,
  });

  const emailLogStatuses = ["SENT", "FAILED"];
  const emailLogTypes = [
    "INVITE",
    "REMINDER",
    "ESCALATION",
    "SUBMISSION",
    "CLARIFICATION",
    "RESET",
    "TEST",
  ];

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
          <CardTitle>{translations("retentionTitle")}</CardTitle>
          <CardDescription>
            {translations("retentionDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RetentionForm
            action={saveEmailLogRetentionSettings}
            fieldName="emailLogRetention"
            label={translations("retentionLabel")}
            help={translations("retentionHelp")}
            value={emailLogRetention}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{translations("cardTitle")}</CardTitle>
          <CardDescription>{translations("cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmailTrackingForm
            result={emailLogs}
            statuses={emailLogStatuses}
            types={emailLogTypes}
            filterQuery={emailFilterQuery}
          />
        </CardContent>
      </Card>
    </div>
  );
}
