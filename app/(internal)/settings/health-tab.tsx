import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBuildInfo, getUptimeSeconds } from "@/lib/build-info";
import { prisma } from "@/lib/prisma";

async function getDbStatus(): Promise<"ok" | "error"> {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return "ok";
  } catch {
    return "error";
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.length > 0 ? parts.join(" ") : "less than 1m";
}

export async function HealthTab() {
  const build = getBuildInfo();
  const uptime = getUptimeSeconds();
  const dbStatus = await getDbStatus();
  const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Application</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="default">Running</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="font-mono text-xs">{build.version}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Commit</span>
            <span className="font-mono text-xs">
              {build.commit !== "unknown" ? build.commit : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Build time</span>
            <span className="text-xs">
              {build.buildTime
                ? new Date(build.buildTime).toLocaleString()
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Uptime</span>
            <span className="text-xs">{formatUptime(uptime)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Memory (heap)</span>
            <span className="text-xs">{memoryUsage} MB</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Connection</span>
            <Badge variant={dbStatus === "ok" ? "default" : "destructive"}>
              {dbStatus === "ok" ? "Connected" : "Error"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
