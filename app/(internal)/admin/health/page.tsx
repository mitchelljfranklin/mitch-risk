import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { HealthTab } from "../health-tab";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Health" };

export default async function AdminHealthPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Health</h1>
        <p className="text-muted-foreground text-sm">
          System diagnostics and scheduled-job status.
        </p>
      </div>
      <HealthTab />
    </div>
  );
}
