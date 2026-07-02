import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getControl } from "@/lib/db/frameworks";

export const dynamic = "force-dynamic";

type ControlDetailPageProps = {
  params: Promise<{ frameworkId: string; controlId: string }>;
};

export async function generateMetadata({
  params,
}: ControlDetailPageProps): Promise<Metadata> {
  const { frameworkId, controlId } = await params;
  const control = await getControl(controlId);
  if (!control || control.frameworkId !== frameworkId) {
    return { title: "Control not found" };
  }
  return { title: `${control.code} — ${control.framework.name}` };
}

export default async function ControlDetailPage({
  params,
}: ControlDetailPageProps) {
  await requirePermission(PERMISSIONS.FRAMEWORKS_VIEW);
  const { frameworkId, controlId } = await params;

  const control = await getControl(controlId);
  if (!control || control.frameworkId !== frameworkId) {
    notFound();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href={`/frameworks/${frameworkId}`}
          className="text-muted-foreground text-sm hover:underline"
        >
          ← {control.framework.name} {control.framework.version}
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <Badge variant="outline" className="font-mono">
            {control.code}
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight">
            {control.title}
          </h1>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">{control.domain}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Guidance</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">{control.guidance}</CardContent>
      </Card>
    </div>
  );
}
