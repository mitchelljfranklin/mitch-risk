import Link from "next/link";
import { getTranslations } from "next-intl/server";

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
import { FlashToast } from "@/components/flash-toast";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { listFrameworks } from "@/lib/db/frameworks";
import { deleteFrameworkAction } from "@/lib/actions/frameworks";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Frameworks.list");
  return { title: translations("title") };
}

type FrameworksPageProps = {
  searchParams: Promise<{ deleteBlocked?: string }>;
};

export default async function FrameworksPage({
  searchParams,
}: FrameworksPageProps) {
  const user = await requirePermission(PERMISSIONS.FRAMEWORKS_VIEW);
  const translations = await getTranslations("Frameworks.list");
  const [frameworks, sp] = await Promise.all([listFrameworks(), searchParams]);
  const canEdit = hasPermission(user.permissions, PERMISSIONS.FRAMEWORKS_EDIT);
  const canDelete = hasPermission(
    user.permissions,
    PERMISSIONS.FRAMEWORKS_DELETE,
  );
  const deleteBlockedCount = sp.deleteBlocked ? Number(sp.deleteBlocked) : 0;

  return (
    <div className="flex flex-col gap-6">
      {deleteBlockedCount > 0 ? (
        <FlashToast
          variant="error"
          message={translations("deleteBlocked", {
            count: deleteBlockedCount,
          })}
        />
      ) : null}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {translations("title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {translations("subtitle")}
          </p>
        </div>
        {canEdit ? (
          <Button asChild variant="outline" size="sm">
            <Link href="/frameworks/import">{translations("import")}</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline" size="sm">
          <Link href="/frameworks/gaps">{translations("gaps")}</Link>
        </Button>
      </div>

      {frameworks.length === 0 ? (
        <EmptyState
          icon="frameworks"
          title={translations("emptyTitle")}
          description={translations("emptyDescription")}
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
                  {translations("controls", {
                    count: framework._count.controls,
                  })}
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
                      title={translations("deleteTitle", {
                        name: framework.name,
                        version: framework.version,
                      })}
                      description={translations("deleteDescription", {
                        count: framework._count.controls,
                      })}
                      confirmLabel={translations("delete")}
                      formId={`delete-framework-${framework.id}`}
                    >
                      <Button type="button" variant="ghost" size="sm">
                        {translations("delete")}
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
