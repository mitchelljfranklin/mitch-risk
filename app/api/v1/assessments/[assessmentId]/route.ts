import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { apiError, runApiHandler } from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { getAssessment } from "@/lib/db/assessments";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  return runApiHandler(async () => {
    const auth = await authenticateRequest(request);
    if (!auth) return apiError("Unauthorized", 401);
    if (!authResultHasPermission(auth, PERMISSIONS.ASSESSMENTS_VIEW))
      return apiError("Forbidden", 403);

    const { assessmentId } = await params;
    const assessment = await getAssessment(assessmentId);
    if (!assessment) return apiError("Not found", 404);

    return Response.json({
      id: assessment.id,
      title: assessment.title,
      status: assessment.status,
      score: assessment.score,
      dueDate: assessment.dueDate,
      sentAt: assessment.sentAt,
      submittedAt: assessment.submittedAt,
      createdAt: assessment.createdAt,
      recurrence: assessment.recurrence,
      vendor: {
        id: assessment.vendor.id,
        name: assessment.vendor.name,
        contactName: assessment.vendor.contactName,
        contactEmail: assessment.vendor.contactEmail,
        tier: assessment.vendor.tier,
      },
      template: assessment.template
        ? {
            name: assessment.template.name,
            version: assessment.template.version,
          }
        : null,
      reviewer: assessment.reviewer
        ? {
            id: assessment.reviewer.id,
            name: assessment.reviewer.name,
            email: assessment.reviewer.email,
          }
        : null,
      questions: assessment.questions.map((q) => ({
        id: q.id,
        sectionTitle: q.sectionTitle,
        text: q.text,
        helpText: q.helpText,
        type: q.type,
        riskWeight: q.riskWeight,
        required: q.required,
        expectedAnswer: q.expectedAnswer,
        options: q.options,
        order: q.order,
        controlIds: q.controlIds,
        response: assessment.responses.find(
          (r) => r.assessmentQuestionId === q.id,
        )
          ? (() => {
              const response = assessment.responses.find(
                (r) => r.assessmentQuestionId === q.id,
              )!;
              return {
                value: response.value,
                isNotApplicable: response.isNotApplicable,
                isCompliant: response.isCompliant,
                weightedScore: response.weightedScore,
                maxScore: response.maxScore,
                review: response.review
                  ? {
                      decision: response.review.decision,
                      note: response.review.note,
                    }
                  : null,
              };
            })()
          : null,
      })),
      findings: assessment.findings.map((f) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        severity: f.severity,
        status: f.status,
        controlCodes: f.controlCodes,
        resolutionNote: f.resolutionNote,
        resolvedAt: f.resolvedAt,
        resolvedByName: f.resolvedBy?.name ?? null,
        createdAt: f.createdAt,
      })),
      comments: assessment.comments.map((c) => ({
        id: c.id,
        authorType: c.authorType,
        authorName: c.authorName,
        body: c.body,
        visibility: c.visibility,
        createdAt: c.createdAt,
        replies: c.replies.map((r) => ({
          id: r.id,
          authorType: r.authorType,
          authorName: r.authorName,
          body: r.body,
          visibility: r.visibility,
          createdAt: r.createdAt,
        })),
      })),
    });
  });
}
