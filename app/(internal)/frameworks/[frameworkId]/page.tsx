import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { SearchInput } from "@/components/search-input";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getFramework, listControls } from "@/lib/db/frameworks";
import { deleteFrameworkAction } from "@/lib/actions/frameworks";

export const dynamic = "force-dynamic";

type FrameworkDetailPageProps = {
  params: Promise<{ frameworkId: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({
  params,
}: FrameworkDetailPageProps): Promise<Metadata> {
  const { frameworkId } = await params;
  const framework = await getFramework(frameworkId);
  if (!framework) return { title: "Framework not found" };
  return { title: framework.name };
}

export default async function FrameworkDetailPage({
  params,
  searchParams,
}: FrameworkDetailPageProps) {
  const user = await requirePermission(PERMISSIONS.FRAMEWORKS_VIEW);
  const { frameworkId } = await params;
  const { q } = await searchParams;

  const framework = await getFramework(frameworkId);
  if (!framework) {
    notFound();
  }

  const controls = await listControls(frameworkId, q);
  const canDelete = hasPermission(
    user.permissions,
    PERMISSIONS.FRAMEWORKS_DELETE,
  );

  const controlsByDomain = new Map<string, typeof controls>();
  for (const control of controls) {
    const existing = controlsByDomain.get(control.domain) ?? [];
    existing.push(control);
    controlsByDomain.set(control.domain, existing);
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        segments={[{ label: "Frameworks", href: "/frameworks" }, { label: framework.name }]}
      />
      <div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            {framework.name}{" "}
            <span className="text-muted-foreground">{framework.version}</span>
          </h1>
          {canDelete ? (
            <form
              id={`delete-framework-${frameworkId}`}
              action={deleteFrameworkAction}
            >
              <input type="hidden" name="frameworkId" value={frameworkId} />
              <ConfirmDialog
                title={`Delete framework "${framework.name} v${framework.version}"?`}
                description={`This will permanently delete this framework and its ${controls.length} control${controls.length !== 1 ? "s" : ""}. Template questions mapped to these controls will lose their assignments. Existing assessments and findings are not affected.`}
                confirmLabel="Delete"
                formId={`delete-framework-${frameworkId}`}
              >
                <Button type="button" variant="destructive" size="sm">
                  Delete framework
                </Button>
              </ConfirmDialog>
            </form>
          ) : null}
        </div>
      </div>

      <div className="bg-background sticky top-14 z-10 pb-2">
        <SearchInput placeholder="Search controls…" />
      </div>

      {controls.length === 0 ? (
        <EmptyState
          compact
          icon="frameworks"
          title="No matching controls"
          description="Try a different search term."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {[...controlsByDomain.entries()].map(([domain, domainControls]) => (
            <section key={domain} className="flex flex-col gap-2">
              <h2 className="text-muted-foreground text-sm font-medium">
                {domain}
              </h2>
              <div className="flex flex-col divide-y rounded-lg border">
                {domainControls.map((control) => (
                  <Link
                    key={control.id}
                    href={`/frameworks/${frameworkId}/controls/${control.id}`}
                    className="hover:bg-accent/40 flex items-center gap-3 p-3 transition-colors"
                  >
                    <Badge variant="outline" className="font-mono">
                      {control.code}
                    </Badge>
                    <span className="text-sm">{control.title}</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
