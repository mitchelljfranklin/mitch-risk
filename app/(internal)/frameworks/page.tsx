import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { listFrameworks } from "@/lib/db/frameworks";
import { deleteFrameworkAction } from "@/lib/actions/frameworks";

export const dynamic = "force-dynamic";

export const metadata = { title: "Frameworks" };

export default async function FrameworksPage() {
  const user = await requirePermission(PERMISSIONS.FRAMEWORKS_VIEW);
  const [frameworks] = await Promise.all([listFrameworks()]);
  const canEdit = hasPermission(user.permissions, PERMISSIONS.FRAMEWORKS_EDIT);
  const canDelete = hasPermission(
    user.permissions,
    PERMISSIONS.FRAMEWORKS_DELETE,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Frameworks</h1>
          <p className="text-muted-foreground text-sm">
            Control libraries used to map questionnaire answers to requirements.
          </p>
        </div>
        {canEdit ? (
          <Button asChild variant="outline" size="sm">
            <Link href="/frameworks/import">Import framework</Link>
          </Button>
        ) : null}
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
            <Card key={framework.id} className="flex flex-col">
              <CardHeader>
                <Link href={`/frameworks/${framework.id}`}>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{framework.name}</CardTitle>
                    <Badge variant="secondary">{framework.version}</Badge>
                  </div>
                  <CardDescription>{framework.description}</CardDescription>
                </Link>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                  {framework._count.controls} controls
                </p>
                {canDelete ? (
                  <form
                    id={`delete-framework-${framework.id}`}
                    action={deleteFrameworkAction}
                  >
                    <input
                      type="hidden"
                      name="frameworkId"
                      value={framework.id}
                    />
                    <ConfirmDialog
                      title={`Delete framework "${framework.name} v${framework.version}"?`}
                      description={`This will permanently delete this framework and its ${framework._count.controls} control${framework._count.controls !== 1 ? "s" : ""}. Template questions mapped to these controls will lose their assignments. Existing assessments and findings are not affected.`}
                      confirmLabel="Delete"
                      formId={`delete-framework-${framework.id}`}
                    >
                      <Button type="button" variant="ghost" size="sm">
                        Delete
                      </Button>
                    </ConfirmDialog>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
