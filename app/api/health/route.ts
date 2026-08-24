export function GET() {
  // Deliberately minimal — version/commit/uptime are operational details
  // that don't need to be disclosed to unauthenticated probes. Docker
  // healthchecks only need a 200 with a status field.
  return Response.json({ status: "ok" });
}
