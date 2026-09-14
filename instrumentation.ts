export async function register() {
  // Only the Node.js runtime hosts the scheduler, and never during
  // `next build` (instrumentation is evaluated there too).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { convergeSystemRolePermissions } = await import("@/lib/db/roles");
  try {
    await convergeSystemRolePermissions();
  } catch (error: unknown) {
    // Never block boot on convergence — the scheduler and app must still
    // come up; the next restart retries.
    console.error(
      "[boot] System role permission convergence failed:",
      error instanceof Error ? error.message : String(error),
    );
  }

  const { startScheduler } = await import("@/lib/scheduler");
  startScheduler();
}
