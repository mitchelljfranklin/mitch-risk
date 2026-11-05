import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBuildInfo, getUptimeSeconds } from "@/lib/build-info";
import { prisma } from "@/lib/prisma";
import { getFormatter, getTranslations } from "next-intl/server";

async function getDbStatus(): Promise<"ok" | "error"> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch {
    return "error";
  }
}

function formatUptime(seconds: number, lessThanMinute: string): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.length > 0 ? parts.join(" ") : lessThanMinute;
}

export async function HealthTab() {
  const translations = await getTranslations("Admin.health");
  const formatter = await getFormatter();
  const build = getBuildInfo();
  const uptime = getUptimeSeconds();
  const dbStatus = await getDbStatus();
  const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{translations("application")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {translations("status")}
            </span>
            <Badge variant="default">{translations("running")}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {translations("version")}
            </span>
            <span className="font-mono text-xs">{build.version}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {translations("commit")}
            </span>
            <span className="font-mono text-xs">
              {build.commit !== "unknown" ? build.commit : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {translations("buildTime")}
            </span>
            <span className="text-xs">
              {build.buildTime
                ? formatter.dateTime(new Date(build.buildTime), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {translations("uptime")}
            </span>
            <span className="text-xs">
              {formatUptime(uptime, translations("lessThanMinute"))}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {translations("memory")}
            </span>
            <span className="text-xs">{memoryUsage} MB</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{translations("database")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {translations("connection")}
            </span>
            <Badge variant={dbStatus === "ok" ? "default" : "destructive"}>
              {dbStatus === "ok"
                ? translations("connected")
                : translations("error")}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
