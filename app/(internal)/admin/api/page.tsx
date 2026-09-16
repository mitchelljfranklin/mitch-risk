import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ApiForm } from "../api-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — API" };

export default async function AdminApiPage() {
  await requirePermission(PERMISSIONS.API_MANAGE);

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
        <h1 className="text-2xl font-semibold tracking-tight">API</h1>
        <p className="text-muted-foreground text-sm">
          Programmatic access to the REST API.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API access</CardTitle>
          <CardDescription>
            Generate API keys for programmatic access to the REST API. Keys use{" "}
            <code className="text-xs">Bearer</code> authentication and can be
            restricted by IP address. Keys are shown only once when created.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiForm enabled={apiEnabled} keys={apiKeys} />
        </CardContent>
      </Card>
    </div>
  );
}
