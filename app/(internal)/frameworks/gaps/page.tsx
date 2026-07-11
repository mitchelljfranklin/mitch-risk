import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Control coverage gaps" };

export default async function FrameworkGapsPage() {
  await requirePermission(PERMISSIONS.FRAMEWORKS_VIEW);

  const frameworks = await prisma.framework.findMany({
    select: {
      id: true,
      name: true,
      version: true,
    },
    orderBy: { name: "asc" },
  });

  const allMappings = await prisma.questionControl.findMany({
    select: { controlId: true },
    distinct: ["controlId"],
  });

  const mappedControlIds = new Set(
    allMappings.map((mapping) => mapping.controlId),
  );

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
          Control coverage gaps
        </h1>
        <p className="text-muted-foreground text-sm">
          Controls that have no questions mapped across any template. Use this
          to identify blind spots in your assessment coverage.
        </p>
      </div>

      {!hasAnyGaps ? (
        <EmptyState
          icon="frameworks"
          title="No gaps found"
          description="Every control in every framework has at least one question mapped to it."
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
                    {gap.mapped}/{gap.total} covered
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gap.unmapped.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    All {gap.total} controls have at least one question mapped.
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
