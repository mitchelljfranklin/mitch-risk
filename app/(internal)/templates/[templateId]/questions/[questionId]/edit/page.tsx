import { notFound } from "next/navigation";

import { QuestionForm } from "@/components/question-form";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listControlOptions } from "@/lib/db/frameworks";
import {
  getQuestion,
  getTemplateStatus,
  listTemplateQuestions,
} from "@/lib/db/templates";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit question" };

type EditQuestionPageProps = {
  params: Promise<{ templateId: string; questionId: string }>;
};

function readConditionField(
  logic: unknown,
  key: "questionId" | "equals",
): string {
  if (
    logic &&
    typeof logic === "object" &&
    !Array.isArray(logic) &&
    key in logic
  ) {
    const value = (logic as Record<string, unknown>)[key];
    return value === undefined || value === null ? "" : String(value);
  }
  return "";
}

export default async function EditQuestionPage({
  params,
}: EditQuestionPageProps) {
  await requirePermission(PERMISSIONS.TEMPLATES_EDIT);
  const { templateId, questionId } = await params;

  const [template, question] = await Promise.all([
    getTemplateStatus(templateId),
    getQuestion(questionId),
  ]);
  if (!template || template.status !== "DRAFT") {
    notFound();
  }
  if (!question || question.section.templateId !== templateId) {
    notFound();
  }

  const [controls, allQuestions] = await Promise.all([
    listControlOptions(),
    listTemplateQuestions(templateId),
  ]);
  const otherQuestions = allQuestions.filter(
    (candidate) => candidate.id !== questionId,
  );

  const options = Array.isArray(question.options)
    ? question.options.map(String)
    : [];
  const expectedAnswer =
    question.expectedAnswer === null || question.expectedAnswer === undefined
      ? ""
      : String(question.expectedAnswer);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit question</h1>
      <QuestionForm
        templateId={templateId}
        sectionId={question.sectionId}
        questionId={question.id}
        controls={controls}
        selectedControlIds={question.controls.map((link) => link.controlId)}
        otherQuestions={otherQuestions}
        defaults={{
          text: question.text,
          helpText: question.helpText ?? "",
          type: question.type,
          riskWeight: question.riskWeight,
          required: question.required,
          options,
          expectedAnswer,
          conditionQuestionId: readConditionField(
            question.conditionalLogic,
            "questionId",
          ),
          conditionEquals: readConditionField(
            question.conditionalLogic,
            "equals",
          ),
        }}
      />
    </div>
  );
}
