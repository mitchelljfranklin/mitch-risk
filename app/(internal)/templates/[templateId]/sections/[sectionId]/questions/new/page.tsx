import { notFound } from "next/navigation";

import { QuestionForm } from "@/components/question-form";
import { requireUser } from "@/lib/auth";
import { listControlOptions } from "@/lib/db/frameworks";
import { getTemplateStatus, listTemplateQuestions } from "@/lib/db/templates";

export const dynamic = "force-dynamic";

export const metadata = { title: "Add question" };

type NewQuestionPageProps = {
  params: Promise<{ templateId: string; sectionId: string }>;
};

export default async function NewQuestionPage({
  params,
}: NewQuestionPageProps) {
  await requireUser();
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
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Add question</h1>
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
