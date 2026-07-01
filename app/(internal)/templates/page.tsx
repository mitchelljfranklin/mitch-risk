import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { listTemplates } from "@/lib/db/templates";

import { ImportTemplateForm } from "./import-template-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Templates" };

const STATUS_VARIANT = {
  DRAFT: "secondary",
  PUBLISHED: "default",
  ARCHIVED: "outline",
} as const;

export default async function TemplatesPage() {
  await requireUser();
  const templates = await listTemplates();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="text-muted-foreground text-sm">
            Build and version security questionnaires.
          </p>
        </div>
        <Button asChild>
          <Link href="/templates/new">New template</Link>
        </Button>
        <ImportTemplateForm />
      </div>

      {templates.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No templates yet. Create your first questionnaire.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((template) => (
            <Link key={template.id} href={`/templates/${template.id}`}>
              <Card className="hover:bg-accent/40 h-full transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{template.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">v{template.version}</Badge>
                      <Badge variant={STATUS_VARIANT[template.status]}>
                        {template.status.toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                  {template.description ? (
                    <CardDescription>{template.description}</CardDescription>
                  ) : null}
                  <p className="text-muted-foreground text-sm">
                    {template._count.sections} sections
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
