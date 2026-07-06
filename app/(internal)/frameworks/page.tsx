import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listFrameworks } from "@/lib/db/frameworks";

export const dynamic = "force-dynamic";

export const metadata = { title: "Frameworks" };

export default async function FrameworksPage() {
  await requirePermission(PERMISSIONS.FRAMEWORKS_VIEW);
  const frameworks = await listFrameworks();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Frameworks</h1>
        <p className="text-muted-foreground text-sm">
          Control libraries used to map questionnaire answers to requirements.
        </p>
      </div>

      {frameworks.length === 0 ? (
        <EmptyState
          icon="frameworks"
          title="No frameworks"
          description="Framework data could not be loaded."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {frameworks.map((framework) => (
            <Link key={framework.id} href={`/frameworks/${framework.id}`}>
              <Card className="hover:bg-accent/40 h-full transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{framework.name}</CardTitle>
                    <Badge variant="secondary">{framework.version}</Badge>
                  </div>
                  <CardDescription>{framework.description}</CardDescription>
                  <p className="text-muted-foreground text-sm">
                    {framework._count.controls} controls
                  </p>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
