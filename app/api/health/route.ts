import { getBuildInfo, getUptimeSeconds } from "@/lib/build-info";

export function GET() {
  const info = getBuildInfo();
  return Response.json({
    status: "ok",
    version: info.version,
    commit: info.commit,
    buildTime: info.buildTime || null,
    uptimeSeconds: getUptimeSeconds(),
  });
}
