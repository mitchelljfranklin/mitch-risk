import { notFound } from "next/navigation";
import type { Metadata } from "next";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getControlWithMappings } from "@/lib/db/templates";

export const dynamic = "force-dynamic";

type ControlDetailPageProps = {
  params: Promise<{ frameworkId: string; controlId: string }>;
};

export async function generateMetadata({
  params,
}: ControlDetailPageProps): Promise<Metadata> {
  const { frameworkId, controlId } = await params;
  const control = await getControlWithMappings(controlId);
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

  const control = await getControlWithMappings(controlId);
  if (!control || control.frameworkId !== frameworkId) {
    notFound();
  }

  // Group mapped questions by template.
  const templateMap = new Map<
    string,
    {
      id: string;
      name: string;
      version: number;
      status: string;
      questions: { id: string; text: string }[];
    }
  >();
  for (const link of control.questionControls) {
    const template = link.question.section.template;
    const entry = templateMap.get(template.id) ?? {
      id: template.id,
      name: template.name,
      version: template.version,
      status: template.status,
      questions: [],
    };
    entry.questions.push({ id: link.question.id, text: link.question.text });
    templateMap.set(template.id, entry);
  }
  const mappedTemplates = [...templateMap.values()];

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: "Frameworks", href: "/frameworks" },
          {
            label: `${control.framework.name} ${control.framework.version}`,
            href: `/frameworks/${frameworkId}`,
          },
          { label: control.title },
        ]}
      />
      <div>
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

      <Card>
        <CardHeader>
          <CardTitle>
            Mapped questions ({control.questionControls.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {mappedTemplates.length === 0 ? (
            <EmptyState
              compact
              icon="templates"
              title="No mapped questions"
              description="No questionnaire questions map to this control yet."
            />
          ) : (
            mappedTemplates.map((template) => (
              <div key={template.id} className="flex flex-col gap-1">
                <Link
                  href={`/templates/${template.id}`}
                  className="flex items-center gap-2 text-sm font-medium hover:underline"
                >
                  {template.name}
                  <Badge variant="outline" className="text-xs">
                    v{template.version}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {template.status.toLowerCase()}
                  </Badge>
                </Link>
                <ul className="text-muted-foreground ml-4 list-disc text-sm">
                  {template.questions.map((question) => (
                    <li key={question.id}>{question.text}</li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
