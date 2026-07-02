import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getTemplateForBuilder } from "@/lib/db/templates";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!authResultHasPermission(auth, PERMISSIONS.TEMPLATES_VIEW)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { templateId } = await params;
  const template = await getTemplateForBuilder(templateId);
  if (!template) {
    return new Response("Not found", { status: 404 });
  }

  const json = {
    name: template.name,
    description: template.description,
    sections: template.sections.map((section) => ({
      title: section.title,
      questions: section.questions.map((question) => ({
        text: question.text,
        helpText: question.helpText,
        type: question.type,
        riskWeight: question.riskWeight,
        required: question.required,
        options: question.options,
        expectedAnswer: question.expectedAnswer,
        conditionalLogic: question.conditionalLogic,
        controlCodes: question.controls.map((qc) => qc.control.code),
      })),
    })),
  };

  return Response.json(json, {
    headers: {
      "Content-Disposition": `attachment; filename="${template.name.replaceAll(" ", "-")}.json"`,
    },
  });
}
