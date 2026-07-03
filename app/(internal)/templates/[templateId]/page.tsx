import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addSectionAction,
  createNewVersionAction,
  deleteQuestionAction,
  deleteSectionAction,
  deleteTemplateAction,
  duplicateTemplateAction,
  moveQuestionAction,
  moveSectionAction,
  publishTemplateAction,
  unpublishTemplateAction,
  updateSectionAction,
  updateTemplateAction,
} from "@/lib/actions/templates";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import {
  getTemplateForBuilder,
  getTemplateVersionChain,
} from "@/lib/db/templates";
import {
  QUESTION_TYPE_LABELS,
  RISK_WEIGHT_LABELS,
} from "@/lib/schemas/template";
import { summarizeConditionalLogic } from "@/lib/portal";
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
  const user = await requirePermission(PERMISSIONS.TEMPLATES_VIEW);
  const canEditTemplate = hasPermission(
    user.permissions,
    PERMISSIONS.TEMPLATES_EDIT,
  );
  const canDeleteTemplate = hasPermission(
    user.permissions,
    PERMISSIONS.TEMPLATES_DELETE,
  );
  const canCreateTemplate = hasPermission(
    user.permissions,
    PERMISSIONS.TEMPLATES_CREATE,
  );
  const { templateId } = await params;
  const template = await getTemplateForBuilder(templateId);
  if (!template) {
    notFound();
  }

  const isDraft = template.status === "DRAFT";
  const canEditDraft = isDraft && canEditTemplate;
  const versionChain = await getTemplateVersionChain(templateId);

  const questionText = new Map<string, string>();
  for (const section of template.sections) {
    for (const question of section.questions) {
      questionText.set(question.id, question.text);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: "Templates", href: "/templates" },
          { label: template.name },
        ]}
      />
      <div>
        <Link
          href="/templates"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Templates
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {template.name}
            <Badge variant="outline">v{template.version}</Badge>
            <Badge variant={isDraft ? "secondary" : "default"}>
              {template.status.toLowerCase()}
            </Badge>
          </h1>
          <div className="flex items-center gap-2">
            {canEditTemplate && isDraft ? (
              <form action={publishTemplateAction}>
                <input type="hidden" name="templateId" value={template.id} />
                <Button type="submit">Publish</Button>
              </form>
            ) : null}
            {canEditTemplate && !isDraft ? (
              <>
                <form action={createNewVersionAction}>
                  <input type="hidden" name="templateId" value={template.id} />
                  <Button type="submit" variant="outline">
                    Create new version
                  </Button>
                </form>
                {template.status === "PUBLISHED" ? (
                  <form action={unpublishTemplateAction}>
                    <input
                      type="hidden"
                      name="templateId"
                      value={template.id}
                    />
                    <Button type="submit" variant="ghost">
                      Unpublish
                    </Button>
                  </form>
                ) : null}
              </>
            ) : null}
            {canDeleteTemplate ? (
              <form
                id={`delete-template-${template.id}`}
                action={deleteTemplateAction}
              >
                <input type="hidden" name="templateId" value={template.id} />
                <ConfirmDialog
                  title="Delete template?"
                  description={`This will permanently delete "${template.name}" and all its sections and questions. Assessments using this template will lose the template link. This action cannot be undone.`}
                  formId={`delete-template-${template.id}`}
                >
                  <Button type="button" variant="outline">
                    Delete
                  </Button>
                </ConfirmDialog>
              </form>
            ) : null}
            <Button asChild variant="outline">
              <Link href={`/templates/${template.id}/preview`}>Preview</Link>
            </Button>
            {canCreateTemplate ? (
              <form action={duplicateTemplateAction}>
                <input type="hidden" name="templateId" value={template.id} />
                <Button type="submit" variant="outline">
                  Duplicate
                </Button>
              </form>
            ) : null}
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

      {canEditDraft ? (
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
      ) : !isDraft ? (
        <p className="text-muted-foreground text-sm">
          This version is published and read-only. Create a new version to make
          changes.
        </p>
      ) : null}

      {template.sections.map((section, sectionIndex) => (
        <Card key={section.id}>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              {canEditDraft ? (
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
              {canEditDraft ? (
                <div className="flex items-center gap-1">
                  <form action={moveSectionAction}>
                    <input
                      type="hidden"
                      name="templateId"
                      value={template.id}
                    />
                    <input type="hidden" name="sectionId" value={section.id} />
                    <input type="hidden" name="direction" value="up" />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon-sm"
                      disabled={sectionIndex === 0}
                      aria-label="Move section up"
                    >
                      ↑
                    </Button>
                  </form>
                  <form action={moveSectionAction}>
                    <input
                      type="hidden"
                      name="templateId"
                      value={template.id}
                    />
                    <input type="hidden" name="sectionId" value={section.id} />
                    <input type="hidden" name="direction" value="down" />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon-sm"
                      disabled={sectionIndex === template.sections.length - 1}
                      aria-label="Move section down"
                    >
                      ↓
                    </Button>
                  </form>
                </div>
              ) : null}
              {canEditDraft ? (
                <form
                  id={`delete-section-${section.id}`}
                  action={deleteSectionAction}
                >
                  <input type="hidden" name="templateId" value={template.id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <ConfirmDialog
                    title="Delete section?"
                    description={`This will permanently delete "${section.title}" and all questions within it.`}
                    formId={`delete-section-${section.id}`}
                  >
                    <Button type="button" variant="ghost" size="sm">
                      Delete section
                    </Button>
                  </ConfirmDialog>
                </form>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {section.questions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No questions yet.</p>
            ) : (
              section.questions.map((question, questionIndex) => {
                const conditionSummary = summarizeConditionalLogic(
                  question.conditionalLogic,
                  questionText,
                );
                return (
                  <div
                    key={question.id}
                    className="flex items-start justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">
                        {question.text}
                      </span>
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
                        {question.controls.length > 0 ? (
                          <span className="text-muted-foreground font-mono text-xs">
                            {question.controls
                              .map((link) => link.control.code)
                              .join(", ")}
                          </span>
                        ) : null}
                      </div>
                      {conditionSummary ? (
                        <p className="text-muted-foreground text-xs italic">
                          {conditionSummary}
                        </p>
                      ) : null}
                    </div>
                    {canEditDraft ? (
                      <div className="flex shrink-0 flex-wrap items-center gap-1">
                        <form action={moveQuestionAction}>
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
                          <input type="hidden" name="direction" value="up" />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon-sm"
                            disabled={questionIndex === 0}
                            aria-label="Move question up"
                          >
                            ↑
                          </Button>
                        </form>
                        <form action={moveQuestionAction}>
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
                          <input type="hidden" name="direction" value="down" />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon-sm"
                            disabled={
                              questionIndex === section.questions.length - 1
                            }
                            aria-label="Move question down"
                          >
                            ↓
                          </Button>
                        </form>
                        <Button asChild variant="ghost" size="sm">
                          <Link
                            href={`/templates/${template.id}/questions/${question.id}/edit`}
                          >
                            Edit
                          </Link>
                        </Button>
                        <form
                          id={`delete-question-${question.id}`}
                          action={deleteQuestionAction}
                        >
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
                          <ConfirmDialog
                            title="Delete question?"
                            description={`This will permanently delete "${question.text.slice(0, 60)}".`}
                            formId={`delete-question-${question.id}`}
                          >
                            <Button type="button" variant="ghost" size="sm">
                              Delete
                            </Button>
                          </ConfirmDialog>
                        </form>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
            {canEditDraft ? (
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

      {canEditDraft ? (
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
