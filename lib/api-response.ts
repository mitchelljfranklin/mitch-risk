export function apiError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function runApiHandler(
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    console.error("[api] unhandled error", error);
    return apiError("Internal error", 500);
  }
}
