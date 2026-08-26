import { env } from "@/lib/env";
import { timingSafeEqualString } from "@/lib/timing-safe";
import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { runScheduledJobsOnce } from "@/lib/scheduler";

export async function GET(request: Request) {
  const providedSecret = request.headers.get("x-cron-secret");
  // Throttle attempts so a short/guessable secret can't be brute-forced
  // online even though the comparison itself is constant-time.
  const clientIp = getClientIp(request.headers);
  if (!rateLimit("cron-secret", clientIp, 10)) {
    return new Response("Too many requests", { status: 429 });
  }
  if (!timingSafeEqualString(providedSecret, env.CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await runScheduledJobsOnce();
  if (!result) {
    return Response.json(
      { error: "A scheduled job run is already in progress" },
      { status: 409 },
    );
  }
  return Response.json(result);
}
