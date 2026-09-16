import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getEmailLogRetention } from "@/lib/settings";
import { listEmailLogs } from "@/lib/db/notifications";
import { buildFilterQueryString } from "@/lib/nav";
import { EmailTrackingForm } from "../email-tracking";
import { RetentionForm } from "../retention-form";
import { saveEmailLogRetentionSettings } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Email tracking" };

export default async function AdminEmailTrackingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const sp = await searchParams;

  const [emailLogs, emailLogRetention] = await Promise.all([
    listEmailLogs({
      status: sp.status,
      type: sp.type,
      recipient: sp.recipient,
      fromDate: sp.fromDate,
      toDate: sp.toDate,
      page: sp.emailLogPage ? parseInt(sp.emailLogPage) : 1,
      pageSize: sp.emailLogPageSize ? parseInt(sp.emailLogPageSize) : undefined,
    }),
    getEmailLogRetention(),
  ]);

  const emailFilterQuery = buildFilterQueryString({
    status: sp.status,
    type: sp.type,
    recipient: sp.recipient,
    fromDate: sp.fromDate,
    toDate: sp.toDate,
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
          Email tracking
        </h1>
        <p className="text-muted-foreground text-sm">
          Delivery status for every email the platform has sent.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Retention</CardTitle>
          <CardDescription>
            Email send records older than this many days are automatically
            pruned by the scheduled cleanup. Set to 0 to keep indefinitely.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RetentionForm
            action={saveEmailLogRetentionSettings}
            fieldName="emailLogRetention"
            label="Email log retention (days)"
            help="Applies on the next scheduled run."
            value={emailLogRetention}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email tracking</CardTitle>
          <CardDescription>
            View the status of every email sent by the platform. Entries are
            retained according to the configured retention policy.
          </CardDescription>
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
