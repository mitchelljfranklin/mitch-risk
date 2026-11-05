import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { QuestionForm } from "@/components/question-form";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listControlOptions } from "@/lib/db/frameworks";
import { getTemplateStatus, listTemplateQuestions } from "@/lib/db/templates";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const translations = await getTranslations("Templates.questionPages");
  return { title: translations("addTitle") };
}

type NewQuestionPageProps = {
  params: Promise<{ templateId: string; sectionId: string }>;
};

export default async function NewQuestionPage({
  params,
}: NewQuestionPageProps) {
  await requirePermission(PERMISSIONS.TEMPLATES_EDIT);
  const translations = await getTranslations("Templates.questionPages");
  const builderTranslations = await getTranslations("Templates.builder");
  const { templateId, sectionId } = await params;

  const template = await getTemplateStatus(templateId);
  if (!template || template.status !== "DRAFT") {
    notFound();
  }

  const [controls, otherQuestions] = await Promise.all([
    listControlOptions(),
    listTemplateQuestions(templateId),
  ]);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          {
            label: builderTranslations("breadcrumbs.templates"),
            href: "/templates",
          },
          {
            label: template.name,
            href: `/templates/${templateId}`,
          },
          { label: translations("addBreadcrumb") },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">
        {translations("addTitle")}
      </h1>
      <QuestionForm
        templateId={templateId}
        sectionId={sectionId}
        controls={controls}
        selectedControlIds={[]}
        otherQuestions={otherQuestions}
      />
    </div>
  );
}
