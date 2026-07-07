export async function POST(request: Request) {
  try {
    const body = await request.json();
    const report = body["csp-report"];
    if (report) {
      console.warn(
        "[csp] violation:",
        `${report["document-uri"] ?? "?"} — ${report["violated-directive"] ?? "unknown directive"} — blocked: ${report["blocked-uri"] ?? "?"}`,
      );
    }
  } catch {
    // malformed report body — silently discard
  }

  return new Response(null, { status: 204 });
}
