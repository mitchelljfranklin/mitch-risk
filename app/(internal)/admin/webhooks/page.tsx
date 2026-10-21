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
import { listWebhookEndpoints } from "@/lib/db/webhooks";
import { WebhooksForm } from "../webhooks-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Admin.webhooks");
  return { title: translations("metaTitle") };
}

export default async function AdminWebhooksPage() {
  await requirePermission(PERMISSIONS.WEBHOOKS_MANAGE);
  const translations = await getTranslations("Admin.webhooks");
  const webhookEndpoints = await listWebhookEndpoints();

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
          <WebhooksForm endpoints={webhookEndpoints} />
        </CardContent>
      </Card>
    </div>
  );
}
