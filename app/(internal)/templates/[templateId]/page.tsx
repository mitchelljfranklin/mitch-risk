import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionGroup } from "@/components/action-group";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { DuplicateTemplateMenuItem } from "@/components/duplicate-template-menu-item";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";
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
import { summarizeConditionalLogic } from "@/lib/portal";
import { prisma } from "@/lib/prisma";

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
  if (!template) {
    const translations = await getTranslations("Templates.builder");
    return { title: translations("notFound") };
  }
  return { title: template.name };
}

export default async function TemplateBuilderPage({
  params,
}: BuilderPageProps) {
  const user = await requirePermission(PERMISSIONS.TEMPLATES_VIEW);
  const translations = await getTranslations("Templates.builder");
  const statusTranslations = await getTranslations("Templates.statuses");
  const commonTranslations = await getTranslations("Common");
  const conditionTranslations = await getTranslations("Templates.conditions");
  const dateFormatter = await getFormatter();
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
    <div className="flex max-w-5xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: translations("breadcrumbs.templates"), href: "/templates" },
          { label: template.name },
        ]}
      />
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {template.name}
            <Badge variant="outline">v{template.version}</Badge>
            <Badge variant={isDraft ? "secondary" : "default"}>
              {statusTranslations.has(template.status)
                ? statusTranslations(template.status)
                : template.status.toLowerCase()}
            </Badge>
          </h1>
          <ActionGroup>
            {canEditTemplate && isDraft ? (
              <form action={publishTemplateAction}>
                <input type="hidden" name="templateId" value={template.id} />
                <Button type="submit">{translations("actions.publish")}</Button>
              </form>
            ) : null}
            {canEditTemplate && !isDraft ? (
              <>
                <form action={createNewVersionAction}>
                  <input type="hidden" name="templateId" value={template.id} />
                  <Button type="submit" variant="outline">
                    {translations("actions.newVersion")}
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
                      {translations("actions.unpublish")}
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
                  title={translations("actions.deleteTitle")}
                  description={translations("actions.deleteDescription", {
                    name: template.name,
                  })}
                  formId={`delete-template-${template.id}`}
                >
                  <Button type="button" variant="outline">
                    {translations("actions.delete")}
                  </Button>
                </ConfirmDialog>
              </form>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={translations("actions.menuAriaLabel")}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/templates/${template.id}/preview`}>
                    {translations("actions.preview")}
                  </Link>
                </DropdownMenuItem>
                {canCreateTemplate ? <DuplicateTemplateMenuItem /> : null}
                <DropdownMenuItem asChild>
                  <a href={`/api/templates/${template.id}/export`} download>
                    {translations("actions.export")}
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canCreateTemplate ? (
              <form
                id="duplicate-template-form"
                action={duplicateTemplateAction}
                className="hidden"
              >
                <input type="hidden" name="templateId" value={template.id} />
              </form>
            ) : null}
          </ActionGroup>
        </div>
      </div>

      {versionChain.length > 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>{translations("versionHistory")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              {versionChain.map((version, versionIndex) => (
                <span key={version.id} className="flex items-center gap-2">
                  {versionIndex > 0 ? (
                    <span className="text-muted-foreground text-xs">→</span>
                  ) : null}
                  <Link
                    href={`/templates/${version.id}`}
                    className={`hover:bg-accent flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
                      version.id === templateId
                        ? "border-primary bg-accent"
                        : ""
                    }`}
                  >
                    <span className="font-medium">v{version.version}</span>
                    <Badge
                      variant={
                        version.status === "DRAFT"
                          ? "secondary"
                          : version.status === "PUBLISHED"
                            ? "default"
                            : "outline"
                      }
                      className="text-xs"
                    >
                      {statusTranslations.has(version.status)
                        ? statusTranslations(version.status)
                        : version.status.toLowerCase()}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {dateFormatter.dateTime(version.updatedAt, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
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
            <CardTitle>{translations("details")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateTemplateAction} className="grid gap-4">
              <input type="hidden" name="templateId" value={template.id} />
              <div className="grid gap-2">
                <Label htmlFor="name">{translations("name")}</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={template.name}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">
                  {translations("description")}
                </Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={template.description ?? ""}
                />
              </div>
              <Button type="submit" variant="secondary" className="w-fit">
                {translations("saveDetails")}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : !isDraft ? (
        <p className="text-muted-foreground text-sm">
          {translations("readOnly")}
        </p>
      ) : null}

      {template.sections.length > 0 ? (
        <nav
          aria-label={translations("jumpToSection")}
          className="flex flex-wrap gap-2"
        >
          {template.sections.map((section) => (
            <a
              key={section.id}
              href={`#section-${section.id}`}
              className="bg-muted hover:bg-accent rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
            >
              {section.title}
              <span className="text-muted-foreground ml-1.5">
                ({section.questions.length})
              </span>
            </a>
          ))}
        </nav>
      ) : null}

      {template.sections.map((section, sectionIndex) => (
        <Card key={section.id} id={`section-${section.id}`}>
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
                    {translations("section.rename")}
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
                      aria-label={translations("section.moveUp")}
                    >
                      <ChevronUp size={14} />
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
                      aria-label={translations("section.moveDown")}
                    >
                      <ChevronDown size={14} />
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
                    title={translations("section.deleteTitle")}
                    description={translations("section.deleteDescription", {
                      title: section.title,
                    })}
                    formId={`delete-section-${section.id}`}
                  >
                    <Button type="button" variant="ghost" size="sm">
                      {translations("section.delete")}
                    </Button>
                  </ConfirmDialog>
                </form>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {section.questions.length === 0 ? (
              <EmptyState
                compact
                icon="templates"
                title={translations("section.noQuestionsTitle")}
                description={translations("section.noQuestionsDescription")}
              />
            ) : (
              <details open className="group/questions">
                <summary className="text-muted-foreground cursor-pointer list-none text-xs font-medium select-none">
                  <span className="inline-flex items-center gap-1 group-open/questions:hidden">
                    <ChevronDown size={12} />{" "}
                    {translations("section.showQuestions", {
                      count: section.questions.length,
                    })}
                  </span>
                  <span className="hidden items-center gap-1 group-open/questions:inline-flex">
                    <ChevronUp size={12} />{" "}
                    {translations("section.hideQuestions", {
                      count: section.questions.length,
                    })}
                  </span>
                </summary>
                <div className="mt-3 flex flex-col gap-3">
                  {section.questions.map((question, questionIndex) => {
                    const conditionSummary = summarizeConditionalLogic(
                      question.conditionalLogic,
                      questionText,
                      conditionTranslations,
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
                              {commonTranslations.has(
                                `questionTypes.${question.type}`,
                              )
                                ? commonTranslations(
                                    `questionTypes.${question.type}`,
                                  )
                                : question.type}
                            </Badge>
                            <Badge variant="outline">
                              {commonTranslations.has(
                                `tiers.${question.riskWeight}`,
                              )
                                ? commonTranslations(
                                    `tiers.${question.riskWeight}`,
                                  )
                                : question.riskWeight}
                            </Badge>
                            {question.required ? (
                              <Badge variant="outline">
                                {translations("section.required")}
                              </Badge>
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
                              <input
                                type="hidden"
                                name="direction"
                                value="up"
                              />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="icon-sm"
                                disabled={questionIndex === 0}
                                aria-label={translations(
                                  "section.moveQuestionUp",
                                )}
                              >
                                <ChevronUp size={14} />
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
                              <input
                                type="hidden"
                                name="direction"
                                value="down"
                              />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="icon-sm"
                                disabled={
                                  questionIndex === section.questions.length - 1
                                }
                                aria-label={translations(
                                  "section.moveQuestionDown",
                                )}
                              >
                                <ChevronDown size={14} />
                              </Button>
                            </form>
                            <Button asChild variant="ghost" size="sm">
                              <Link
                                href={`/templates/${template.id}/questions/${question.id}/edit`}
                              >
                                {translations("section.editQuestion")}
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
                                title={translations(
                                  "section.deleteQuestionTitle",
                                )}
                                description={translations(
                                  "section.deleteQuestionDescription",
                                  { text: question.text.slice(0, 60) },
                                )}
                                formId={`delete-question-${question.id}`}
                              >
                                <Button type="button" variant="ghost" size="sm">
                                  {translations("section.deleteQuestion")}
                                </Button>
                              </ConfirmDialog>
                            </form>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
            {canEditDraft ? (
              <Button asChild variant="outline" size="sm" className="w-fit">
                <Link
                  href={`/templates/${template.id}/sections/${section.id}/questions/new`}
                >
                  {translations("section.addQuestion")}
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ))}

      {canEditDraft ? (
        <Card>
          <CardHeader>
            <CardTitle>{translations("addSection.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addSectionAction} className="flex items-center gap-2">
              <input type="hidden" name="templateId" value={template.id} />
              <Input
                name="title"
                placeholder={translations("addSection.placeholder")}
                required
                className="max-w-sm"
              />
              <Button type="submit" variant="secondary">
                {translations("addSection.button")}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
