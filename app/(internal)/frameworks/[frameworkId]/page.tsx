import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { SearchInput } from "@/components/search-input";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getFramework, listControls } from "@/lib/db/frameworks";

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
  await requirePermission(PERMISSIONS.FRAMEWORKS_VIEW);
  const { frameworkId } = await params;
  const { q } = await searchParams;

  const framework = await getFramework(frameworkId);
  if (!framework) {
    notFound();
  }

  const controls = await listControls(frameworkId, q);

  const controlsByDomain = new Map<string, typeof controls>();
  for (const control of controls) {
    const existing = controlsByDomain.get(control.domain) ?? [];
    existing.push(control);
    controlsByDomain.set(control.domain, existing);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/frameworks"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Frameworks
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {framework.name}{" "}
          <span className="text-muted-foreground">{framework.version}</span>
        </h1>
      </div>

      <div className="bg-background sticky top-14 z-10 pb-2">
        <SearchInput placeholder="Search controls…" />
      </div>

      {controls.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No controls match your search.
        </p>
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
