import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { apiError, runApiHandler } from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { getAssessment } from "@/lib/db/assessments";
import { prisma } from "@/lib/prisma";

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

    const allControlIds = [
      ...new Set(
        assessment.questions.flatMap((question) => question.controlIds),
      ),
    ];
    const sharedControls =
      allControlIds.length > 0
        ? await prisma.control.findMany({
            where: {
              code: { in: allControlIds },
              isSharedResponsibility: true,
            },
            select: { code: true },
          })
        : [];
    const sharedControlCodes = new Set(
      sharedControls.map((control) => control.code),
    );

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
      questions: assessment.questions.map((question) => ({
        id: question.id,
        sectionTitle: question.sectionTitle,
        text: question.text,
        helpText: question.helpText,
        type: question.type,
        riskWeight: question.riskWeight,
        required: question.required,
        expectedAnswer: question.expectedAnswer,
        options: question.options,
        order: question.order,
        controlIds: question.controlIds,
        sharedControlIds: question.controlIds.filter((code) =>
          sharedControlCodes.has(code),
        ),
        response: assessment.responses.find(
          (response) => response.assessmentQuestionId === question.id,
        )
          ? (() => {
              const response = assessment.responses.find(
                (res) => res.assessmentQuestionId === question.id,
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
      findings: assessment.findings.map((finding) => ({
        id: finding.id,
        title: finding.title,
        description: finding.description,
        severity: finding.severity,
        status: finding.status,
        controlCodes: finding.controlCodes,
        resolutionNote: finding.resolutionNote,
        resolvedAt: finding.resolvedAt,
        resolvedByName: finding.resolvedBy?.name ?? null,
        createdAt: finding.createdAt,
      })),
      comments: assessment.comments.map((comment) => ({
        id: comment.id,
        authorType: comment.authorType,
        authorName: comment.authorName,
        body: comment.body,
        visibility: comment.visibility,
        createdAt: comment.createdAt,
        replies: comment.replies.map((response) => ({
          id: response.id,
          authorType: response.authorType,
          authorName: response.authorName,
          body: response.body,
          visibility: response.visibility,
          createdAt: response.createdAt,
        })),
      })),
    });
  });
}
