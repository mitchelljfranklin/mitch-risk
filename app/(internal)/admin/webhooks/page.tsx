import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listWebhookEndpoints } from "@/lib/db/webhooks";
import { WebhooksForm } from "../webhooks-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Webhooks" };

export default async function AdminWebhooksPage() {
  await requirePermission(PERMISSIONS.WEBHOOKS_MANAGE);
  const webhookEndpoints = await listWebhookEndpoints();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Webhooks</h1>
        <p className="text-muted-foreground text-sm">
          Event notifications pushed to your endpoints.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>
            Configure endpoints to receive event notifications when assessments
            are submitted, findings change, or certifications expire.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WebhooksForm endpoints={webhookEndpoints} />
        </CardContent>
      </Card>
    </div>
  );
}
