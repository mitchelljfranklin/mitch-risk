import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addSectionAction,
  createNewVersionAction,
  deleteQuestionAction,
  deleteSectionAction,
  deleteTemplateAction,
  publishTemplateAction,
  updateSectionAction,
  updateTemplateAction,
} from "@/lib/actions/templates";
import { requireUser } from "@/lib/auth";
import {
  getTemplateForBuilder,
  getTemplateVersionChain,
} from "@/lib/db/templates";
import {
  QUESTION_TYPE_LABELS,
  RISK_WEIGHT_LABELS,
} from "@/lib/schemas/template";
import { prisma } from "@/lib/prisma";

import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type BuilderPageProps = {
  params: Promise<{ templateId: string }>;
};

export async function generateMetadata({
  params,
}: BuilderPageProps): Promise<Metadata> {
  const { templateId } = await params;
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: { name: true },
  });
  if (!template) return { title: "Template not found" };
  return { title: template.name };
}

export default async function TemplateBuilderPage({
  params,
}: BuilderPageProps) {
  await requireUser();
  const { templateId } = await params;
  const template = await getTemplateForBuilder(templateId);
  if (!template) {
    notFound();
  }

  const isDraft = template.status === "DRAFT";
  const versionChain = await getTemplateVersionChain(templateId);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/templates"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Templates
        </Link>
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {template.name}
            <Badge variant="outline">v{template.version}</Badge>
            <Badge variant={isDraft ? "secondary" : "default"}>
              {template.status.toLowerCase()}
            </Badge>
          </h1>
          <div className="flex items-center gap-2">
            {isDraft ? (
              <form action={publishTemplateAction}>
                <input type="hidden" name="templateId" value={template.id} />
                <Button type="submit">Publish</Button>
              </form>
            ) : (
              <form action={createNewVersionAction}>
                <input type="hidden" name="templateId" value={template.id} />
                <Button type="submit">Create new version</Button>
              </form>
            )}
            <form action={deleteTemplateAction}>
              <input type="hidden" name="templateId" value={template.id} />
              <Button type="submit" variant="outline">
                Delete
              </Button>
            </form>
            <Button asChild variant="outline">
              <a href={`/api/templates/${template.id}/export`} download>
                Export
              </a>
            </Button>
          </div>
        </div>
      </div>

      {versionChain.length > 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Version history</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              {versionChain.map((v, i) => (
                <span key={v.id} className="flex items-center gap-2">
                  {i > 0 ? (
                    <span className="text-muted-foreground text-xs">→</span>
                  ) : null}
                  <Link
                    href={`/templates/${v.id}`}
                    className={`hover:bg-accent flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
                      v.id === templateId ? "border-primary bg-accent" : ""
                    }`}
                  >
                    <span className="font-medium">v{v.version}</span>
                    <Badge
                      variant={
                        v.status === "DRAFT"
                          ? "secondary"
                          : v.status === "PUBLISHED"
                            ? "default"
                            : "outline"
                      }
                      className="text-[10px]"
                    >
                      {v.status.toLowerCase()}
                    </Badge>
                    <span className="text-muted-foreground text-[10px]">
                      {formatDate(v.updatedAt)}
                    </span>
                  </Link>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isDraft ? (
        <Card>
          <CardHeader>
            <CardTitle>Template details</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateTemplateAction} className="grid gap-4">
              <input type="hidden" name="templateId" value={template.id} />
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={template.name}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={template.description ?? ""}
                />
              </div>
              <Button type="submit" variant="secondary" className="w-fit">
                Save details
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <p className="text-muted-foreground text-sm">
          This version is published and read-only. Create a new version to make
          changes.
        </p>
      )}

      {template.sections.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              {isDraft ? (
                <form
                  action={updateSectionAction}
                  className="flex flex-1 items-center gap-2"
                >
                  <input type="hidden" name="templateId" value={template.id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <Input
                    name="title"
                    defaultValue={section.title}
                    required
                    className="max-w-sm"
                  />
                  <Button type="submit" variant="secondary" size="sm">
                    Rename
                  </Button>
                </form>
              ) : (
                <CardTitle>{section.title}</CardTitle>
              )}
              {isDraft ? (
                <form action={deleteSectionAction}>
                  <input type="hidden" name="templateId" value={template.id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Delete section
                  </Button>
                </form>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {section.questions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No questions yet.</p>
            ) : (
              section.questions.map((question) => (
                <div
                  key={question.id}
                  className="flex items-start justify-between gap-3 rounded-md border p-3"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{question.text}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {QUESTION_TYPE_LABELS[question.type]}
                      </Badge>
                      <Badge variant="outline">
                        {RISK_WEIGHT_LABELS[question.riskWeight]}
                      </Badge>
                      {question.required ? (
                        <Badge variant="outline">Required</Badge>
                      ) : null}
                      {question.conditionalLogic ? (
                        <Badge variant="outline">Conditional</Badge>
                      ) : null}
                      {question.controls.length > 0 ? (
                        <span className="text-muted-foreground font-mono text-xs">
                          {question.controls
                            .map((link) => link.control.code)
                            .join(", ")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {isDraft ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link
                          href={`/templates/${template.id}/questions/${question.id}/edit`}
                        >
                          Edit
                        </Link>
                      </Button>
                      <form action={deleteQuestionAction}>
                        <input
                          type="hidden"
                          name="templateId"
                          value={template.id}
                        />
                        <input
                          type="hidden"
                          name="questionId"
                          value={question.id}
                        />
                        <Button type="submit" variant="ghost" size="sm">
                          Delete
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </div>
              ))
            )}
            {isDraft ? (
              <Button asChild variant="outline" size="sm" className="w-fit">
                <Link
                  href={`/templates/${template.id}/sections/${section.id}/questions/new`}
                >
                  Add question
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ))}

      {isDraft ? (
        <Card>
          <CardHeader>
            <CardTitle>Add section</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addSectionAction} className="flex items-center gap-2">
              <input type="hidden" name="templateId" value={template.id} />
              <Input
                name="title"
                placeholder="Section title"
                required
                className="max-w-sm"
              />
              <Button type="submit" variant="secondary">
                Add section
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
