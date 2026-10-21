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
import { prisma } from "@/lib/prisma";
import { ApiForm } from "../api-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Admin.api");
  return { title: translations("metaTitle") };
}

export default async function AdminApiPage() {
  await requirePermission(PERMISSIONS.API_MANAGE);
  const translations = await getTranslations("Admin.api");

  const [apiKeys, apiEnabled] = await Promise.all([
    prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        prefix: true,
        disabled: true,
        expiresAt: true,
        lastUsedAt: true,
        requestCount: true,
        allowedIps: true,
        rateLimitPerMin: true,
        permissions: true,
        createdAt: true,
      },
    }),
    prisma.appSetting
      .findUnique({ where: { key: "api.enabled" } })
      .then((settingsResult) => settingsResult?.value === true),
  ]);

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
          <ApiForm enabled={apiEnabled} keys={apiKeys} />
        </CardContent>
      </Card>
    </div>
  );
}
