import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
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
  const user = await requirePermission(PERMISSIONS.TEMPLATES_VIEW);
  const canCreateTemplate = hasPermission(
    user.permissions,
    PERMISSIONS.TEMPLATES_CREATE,
  );
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
        {canCreateTemplate ? (
          <>
            <Button asChild>
              <Link href="/templates/new">New template</Link>
            </Button>
            <ImportTemplateForm />
          </>
        ) : null}
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon="templates"
          title="No templates yet"
          description="Create your first assessment template."
        />
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
