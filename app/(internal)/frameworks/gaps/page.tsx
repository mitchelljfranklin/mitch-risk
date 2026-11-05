import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listAllFrameworks, getAllMappedControlIds } from "@/lib/db/frameworks";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Frameworks.gaps");
  return { title: translations("title") };
}

export default async function FrameworkGapsPage() {
  await requirePermission(PERMISSIONS.FRAMEWORKS_VIEW);
  const translations = await getTranslations("Frameworks.gaps");

  const frameworks = await listAllFrameworks();
  const mappedControlIds = await getAllMappedControlIds();

  const frameworkGaps = await Promise.all(
    frameworks.map(async (framework) => {
      const controls = await prisma.control.findMany({
        where: { frameworkId: framework.id },
        select: { id: true, code: true, title: true, domain: true },
        orderBy: [{ domain: "asc" }, { code: "asc" }],
      });

      const unmapped = controls.filter(
        (control) => !mappedControlIds.has(control.id),
      );

      return {
        frameworkId: framework.id,
        frameworkName: framework.name,
        frameworkVersion: framework.version,
        total: controls.length,
        mapped: controls.length - unmapped.length,
        unmapped,
      };
    }),
  );

  const hasAnyGaps = frameworkGaps.some((gap) => gap.unmapped.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {translations("title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {translations("subtitle")}
        </p>
      </div>

      {!hasAnyGaps ? (
        <EmptyState
          icon="frameworks"
          title={translations("emptyTitle")}
          description={translations("emptyDescription")}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {frameworkGaps.map((gap) => (
            <Card key={gap.frameworkId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {gap.frameworkName}
                  {gap.frameworkVersion ? (
                    <span className="text-muted-foreground text-sm font-normal">
                      v{gap.frameworkVersion}
                    </span>
                  ) : null}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {translations("covered", {
                      mapped: gap.mapped,
                      total: gap.total,
                    })}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gap.unmapped.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {translations("allCovered", { count: gap.total })}
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {gap.unmapped.map((control) => (
                      <Link
                        key={control.id}
                        href={`/frameworks/${gap.frameworkId}/controls/${control.id}`}
                        className="hover:bg-accent/40 flex items-center justify-between rounded-md px-2 py-1.5 text-sm"
                      >
                        <span>
                          <span className="font-mono text-xs">
                            {control.code}
                          </span>{" "}
                          {control.title}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-xs">
                          {control.domain}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
