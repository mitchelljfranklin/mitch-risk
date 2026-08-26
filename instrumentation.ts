export async function register() {
  // Only the Node.js runtime hosts the scheduler, and never during
  // `next build` (instrumentation is evaluated there too).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { startScheduler } = await import("@/lib/scheduler");
  startScheduler();
}
