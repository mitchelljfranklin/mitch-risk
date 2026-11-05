import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { CopyLink } from "@/components/copy-link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionGroup } from "@/components/action-group";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProgressBar } from "@/components/progress-bar";
import { PendingLink } from "@/components/pending-link";
import { prisma } from "@/lib/prisma";
import {
  deleteAssessmentAction,
  extendAssessmentAction,
  regenerateAssessmentAction,
  revokeAssessmentAction,
} from "@/lib/actions/assessments";
import { reopenReviewAction } from "@/lib/actions/collaboration";
import { FinalizeButton } from "./finalize-button";
import { DraftEditor } from "./draft-editor";
import { SendForms } from "./send-forms";
import { SendBackDialog } from "./send-back-dialog";
import { FindingStatusForm } from "./finding-status-form";
import { ReviewPanel } from "@/components/review-panel";
import { AttachEvidenceButton } from "@/components/attach-evidence-button";
import { EvidencePreview } from "@/components/evidence-preview";
import { ScoreBadge } from "@/components/score-badge";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getAssessment } from "@/lib/db/assessments";
import { env } from "@/lib/env";
import {
  FINDING_STATUS_STYLES,
  SEVERITY_ACCENT,
  SEVERITY_STYLES,
} from "@/lib/schemas/assessment";
import { AUTOMATED_FINDING_DESCRIPTION } from "@/lib/schemas/findings";
import { cn, formatResponseValue } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AssessmentDetailPageProps = {
  params: Promise<{ assessmentId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export async function generateMetadata({
  params,
}: AssessmentDetailPageProps): Promise<Metadata> {
  const { assessmentId } = await params;
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { title: true },
  });
  if (!assessment) {
    const translations = await getTranslations("Assessments.detail");
    return { title: translations("notFound") };
  }
  return { title: assessment.title };
}

export default async function AssessmentDetailPage({
  params,
  searchParams,
}: AssessmentDetailPageProps) {
  const user = await requirePermission(PERMISSIONS.ASSESSMENTS_VIEW);
  const translations = await getTranslations("Assessments.detail");
  const commonTranslations = await getTranslations("Common");
  const dateFormatter = await getFormatter();
  const canCreate = hasPermission(
    user.permissions,
    PERMISSIONS.ASSESSMENTS_CREATE,
  );
  const canEdit = hasPermission(user.permissions, PERMISSIONS.ASSESSMENTS_EDIT);
  const canReview = hasPermission(
    user.permissions,
    PERMISSIONS.ASSESSMENTS_REVIEW,
  );
  const canDelete = hasPermission(
    user.permissions,
    PERMISSIONS.ASSESSMENTS_DELETE,
  );
  const canEditVendor = hasPermission(
    user.permissions,
    PERMISSIONS.VENDORS_EDIT,
  );
  const { assessmentId } = await params;
  const assessment = await getAssessment(assessmentId);
  if (!assessment) {
    notFound();
  }

  const searchParameters = await searchParams;
  const reviewFilter = searchParameters.review ?? "all";

  const isDraft = assessment.status === "DRAFT";
  const isReviewable =
    assessment.status === "SUBMITTED" || assessment.status === "UNDER_REVIEW";
  const isCompleted = assessment.status === "COMPLETED";
  const portalUrl = assessment.accessToken
    ? `${env.APP_URL}/portal/${assessment.accessToken}`
    : null;

  // Review progress across answerable (non-N/A) responses.
  const answerable = assessment.responses.filter(
    (response) => !response.isNotApplicable,
  );
  const reviewCounts = {
    total: answerable.length,
    approved: answerable.filter(
      (response) => response.review?.decision === "APPROVED",
    ).length,
    clarification: answerable.filter(
      (response) => response.review?.decision === "CLARIFICATION_REQUESTED",
    ).length,
    pending: answerable.filter((response) => !response.review).length,
  };

  const openFindings = assessment.findings.filter(
    (finding) => finding.status === "OPEN",
  ).length;

  type ResponseRow = (typeof assessment.responses)[number];
  function matchesReviewFilter(response: ResponseRow | undefined): boolean {
    if (reviewFilter === "all") return true;
    if (!response || response.isNotApplicable) return false;
    if (reviewFilter === "pending") return !response.review;
    if (reviewFilter === "approved")
      return response.review?.decision === "APPROVED";
    if (reviewFilter === "clarification")
      return response.review?.decision === "CLARIFICATION_REQUESTED";
    return true;
  }

  const reviewFilters = [
    { value: "all", label: translations("responses.filters.all") },
    {
      value: "pending",
      label: translations("responses.filters.pending", {
        count: reviewCounts.pending,
      }),
    },
    {
      value: "approved",
      label: translations("responses.filters.approved", {
        count: reviewCounts.approved,
      }),
    },
    {
      value: "clarification",
      label: translations("responses.filters.clarification", {
        count: reviewCounts.clarification,
      }),
    },
  ];

  const responsesByQuestion = new Map(
    assessment.responses.map((response) => [
      response.assessmentQuestionId,
      response,
    ]),
  );
  const evidenceByQuestion = new Map<string, typeof assessment.evidence>();
  for (const item of assessment.evidence) {
    if (!item.assessmentQuestionId) {
      continue;
    }
    const evidenceForQuestion =
      evidenceByQuestion.get(item.assessmentQuestionId) ?? [];
    evidenceForQuestion.push(item);
    evidenceByQuestion.set(item.assessmentQuestionId, evidenceForQuestion);
  }
  const commentsByQuestion = new Map<string, typeof assessment.comments>();
  const replyByParentId = new Map<string, typeof assessment.comments>();
  for (const comment of assessment.comments) {
    const questionId = comment.assessmentQuestionId ?? "";
    const commentsForQuestion = commentsByQuestion.get(questionId) ?? [];
    commentsForQuestion.push(comment);
    commentsByQuestion.set(questionId, commentsForQuestion);
    if (comment.parentId) {
      const repliesForComment = replyByParentId.get(comment.parentId) ?? [];
      repliesForComment.push(comment);
      replyByParentId.set(comment.parentId, repliesForComment);
    }
  }

  const repliesRecord: Record<
    string,
    Array<{
      id: string;
      authorName: string;
      body: string;
      visibility: string;
      createdAt: string;
    }>
  > = {};
  for (const [parentId, replies] of replyByParentId) {
    repliesRecord[parentId] = replies.map((reply) => ({
      id: reply.id,
      authorName: reply.authorName,
      body: reply.body,
      visibility: reply.visibility,
      createdAt: reply.createdAt.toISOString(),
    }));
  }

  function riskLabel(score: number): string {
    if (score >= 0.85) {
      return translations("score.low");
    }
    if (score >= 0.6) {
      return translations("score.moderate");
    }
    return translations("score.high");
  }

  function scoreBarClass(score: number): string {
    if (score >= 0.85) {
      return "bg-[var(--rag-green)]";
    }
    if (score >= 0.6) {
      return "bg-[var(--rag-amber)]";
    }
    return "bg-[var(--rag-red)]";
  }

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Breadcrumbs
        segments={
          searchParameters.back?.startsWith("/assessments")
            ? [
                {
                  label: translations("breadcrumbs.assessments"),
                  href: searchParameters.back,
                },
                { label: assessment.title },
              ]
            : [
                {
                  label: translations("breadcrumbs.vendors"),
                  href: "/vendors",
                },
                {
                  label: assessment.vendor.name,
                  href: `/vendors/${assessment.vendorId}`,
                },
                { label: assessment.title },
              ]
        }
      />
      <div>
        <div className="mt-2 flex flex-col gap-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {assessment.title}
            <Badge variant="secondary">
              {commonTranslations.has(`assessmentStatuses.${assessment.status}`)
                ? commonTranslations(`assessmentStatuses.${assessment.status}`)
                : assessment.status}
            </Badge>
          </h1>
          <ActionGroup>
            {isReviewable && canReview ? (
              <>
                <SendBackDialog assessmentId={assessment.id} />
                <FinalizeButton assessmentId={assessment.id} />
              </>
            ) : null}
            {isCompleted && canReview ? (
              <>
                <form action={reopenReviewAction}>
                  <input
                    type="hidden"
                    name="assessmentId"
                    value={assessment.id}
                  />
                  <Button type="submit" variant="outline" size="sm">
                    {translations("actions.reopen")}
                  </Button>
                </form>
                <SendBackDialog assessmentId={assessment.id} />
              </>
            ) : null}
            <Button asChild variant="outline" size="sm">
              <a href={`/api/assessments/${assessment.id}/export`} download>
                {translations("actions.exportCsv")}
              </a>
            </Button>
            {assessment.status === "SUBMITTED" ||
            assessment.status === "UNDER_REVIEW" ||
            assessment.status === "COMPLETED" ? (
              <Button asChild variant="outline" size="sm">
                <PendingLink
                  href={`/api/assessments/${assessment.id}/pdf`}
                  pendingLabel={translations("actions.preparingReport")}
                >
                  {translations("actions.downloadPdf")}
                </PendingLink>
              </Button>
            ) : null}
            {canDelete ? (
              <form
                id={`delete-assessment-${assessment.id}`}
                action={deleteAssessmentAction}
              >
                <input
                  type="hidden"
                  name="assessmentId"
                  value={assessment.id}
                />
                <ConfirmDialog
                  title={translations("actions.deleteTitle")}
                  description={translations("actions.deleteDescription", {
                    title: assessment.title,
                  })}
                  formId={`delete-assessment-${assessment.id}`}
                >
                  <Button type="button" variant="outline">
                    {translations("actions.delete")}
                  </Button>
                </ConfirmDialog>
              </form>
            ) : null}
          </ActionGroup>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          <Link
            href={`/vendors/${assessment.vendorId}`}
            className="hover:underline"
          >
            {assessment.vendor.name}
          </Link>
          {assessment.template
            ? ` · ${assessment.template.name} v${assessment.template.version}`
            : ""}
          {assessment.dueDate
            ? translations("meta.due", {
                date: dateFormatter.dateTime(assessment.dueDate, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                }),
              })
            : ""}
          {assessment.reviewer
            ? translations("meta.reviewer", {
                name: assessment.reviewer.name,
              })
            : ""}
        </p>
      </div>

      {isDraft && canCreate ? (
        <Card>
          <CardHeader>
            <CardTitle>{translations("draft.createLinkTitle")}</CardTitle>
            <CardDescription>
              {translations("draft.createLinkDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SendForms assessmentId={assessment.id} />
          </CardContent>
        </Card>
      ) : null}

      {isDraft && canEdit ? (
        <DraftEditor
          assessmentId={assessment.id}
          title={assessment.title}
          dueDate={
            assessment.dueDate
              ? assessment.dueDate.toISOString().slice(0, 10)
              : ""
          }
        />
      ) : null}

      {portalUrl ? (
        <Card>
          <CardHeader>
            <CardTitle>{translations("link.title")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <CopyLink value={portalUrl} />
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-muted-foreground text-xs">
                {assessment.tokenExpiresAt
                  ? translations("link.expires", {
                      date: dateFormatter.dateTime(assessment.tokenExpiresAt, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }),
                    })
                  : translations("link.noExpiry")}
              </p>
              {assessment.portalPasswordHash ? (
                <Badge variant="secondary" className="text-xs">
                  {translations("link.passwordProtected")}
                </Badge>
              ) : null}
            </div>
            {canEdit ? (
              <div className="flex flex-wrap items-center gap-2">
                <form action={extendAssessmentAction}>
                  <input
                    type="hidden"
                    name="assessmentId"
                    value={assessment.id}
                  />
                  <Button type="submit" variant="outline" size="sm">
                    {translations("link.extend")}
                  </Button>
                </form>
                <form action={regenerateAssessmentAction}>
                  <input
                    type="hidden"
                    name="assessmentId"
                    value={assessment.id}
                  />
                  <Button type="submit" variant="outline" size="sm">
                    {translations("link.regenerate")}
                  </Button>
                </form>
                <form
                  id={`revoke-${assessment.id}`}
                  action={revokeAssessmentAction}
                >
                  <input
                    type="hidden"
                    name="assessmentId"
                    value={assessment.id}
                  />
                  <ConfirmDialog
                    title={translations("link.revokeTitle")}
                    description={translations("link.revokeDescription")}
                    confirmLabel={translations("link.revoke")}
                    variant="destructive"
                    formId={`revoke-${assessment.id}`}
                  >
                    <Button type="button" variant="ghost" size="sm">
                      {translations("link.revoke")}
                    </Button>
                  </ConfirmDialog>
                </form>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {!isDraft && !portalUrl ? (
        <Card>
          <CardHeader>
            <CardTitle>{translations("link.revokedTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm">
              {translations("link.revokedDescription")}
            </p>
            {canEdit ? (
              <form action={regenerateAssessmentAction}>
                <input
                  type="hidden"
                  name="assessmentId"
                  value={assessment.id}
                />
                <Button type="submit" variant="outline" size="sm">
                  {translations("link.regenerate")}
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {assessment.score !== null ? (
        <Card>
          <CardHeader>
            <CardTitle>{translations("score.title")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-baseline gap-3">
              <ScoreBadge score={assessment.score} size="lg" />
              <span className="text-muted-foreground text-sm">
                {riskLabel(assessment.score)}
              </span>
            </div>
            <div>
              <ProgressBar
                value={Math.round(assessment.score * 100)}
                className={scoreBarClass(assessment.score)}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {assessment.findings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {translations("findings.summary", {
                count: assessment.findings.length,
                open: openFindings,
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {assessment.findings.map((finding) => {
              return (
                <div
                  key={finding.id}
                  className={`rounded-md border p-3 ${SEVERITY_ACCENT[finding.severity] ?? ""}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                        SEVERITY_STYLES[finding.severity] ??
                          "bg-muted text-muted-foreground",
                      )}
                    >
                      {commonTranslations.has(`tiers.${finding.severity}`)
                        ? commonTranslations(`tiers.${finding.severity}`)
                        : finding.severity}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                        FINDING_STATUS_STYLES[finding.status] ??
                          "bg-muted text-muted-foreground",
                      )}
                    >
                      {commonTranslations.has(
                        `findingStatuses.${finding.status}`,
                      )
                        ? commonTranslations(
                            `findingStatuses.${finding.status}`,
                          )
                        : finding.status}
                    </span>
                    <span className="text-sm font-medium">{finding.title}</span>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {finding.description === AUTOMATED_FINDING_DESCRIPTION
                      ? translations("findings.automatedDescription")
                      : finding.description}
                  </p>
                  {finding.controlCodes.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {finding.controlCodes.map((code) => (
                        <Badge
                          key={code}
                          variant="outline"
                          className="font-mono text-xs"
                        >
                          {code}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {finding.resolutionNote || finding.resolvedAt ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {finding.resolutionNote
                        ? `“${finding.resolutionNote}” · `
                        : ""}
                      {finding.resolvedBy?.name ??
                        translations("findings.deletedUser")}
                      {finding.resolvedAt
                        ? ` · ${dateFormatter.dateTime(finding.resolvedAt, {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}`
                        : ""}
                    </p>
                  ) : null}
                  {canReview ? (
                    <FindingStatusForm
                      findingId={finding.id}
                      assessmentId={assessment.id}
                      currentStatus={finding.status}
                      currentNote={finding.resolutionNote ?? ""}
                    />
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : assessment.score !== null ? (
        <Card>
          <CardHeader>
            <CardTitle>{translations("findings.noneTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {translations("findings.allCompliant")}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {assessment.questions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{translations("responses.title")}</CardTitle>
            {reviewCounts.total > 0 ? (
              <CardDescription>
                {translations("responses.summary", {
                  approved: reviewCounts.approved,
                  total: reviewCounts.total,
                  pending: reviewCounts.pending,
                })}
                {reviewCounts.clarification > 0
                  ? translations("responses.summaryClarifications", {
                      count: reviewCounts.clarification,
                    })
                  : ""}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {reviewCounts.total > 0 ? (
              <>
                <ProgressBar
                  value={Math.round(
                    (reviewCounts.approved / reviewCounts.total) * 100,
                  )}
                  className="bg-success"
                />
                <div className="flex flex-wrap gap-1.5">
                  {reviewFilters.map((filter) => (
                    <Button
                      key={filter.value}
                      asChild
                      size="sm"
                      variant={
                        reviewFilter === filter.value ? "default" : "outline"
                      }
                    >
                      <Link
                        href={`/assessments/${assessment.id}${filter.value === "all" ? "" : `?review=${filter.value}`}`}
                      >
                        {filter.label}
                      </Link>
                    </Button>
                  ))}
                </div>
              </>
            ) : null}
            {assessment.questions.map((question, questionIndex) => {
              const response = responsesByQuestion.get(question.id);
              if (!matchesReviewFilter(response)) {
                return null;
              }
              const prevQuestion = assessment.questions[questionIndex - 1];
              const showSectionHeader =
                questionIndex === 0 ||
                prevQuestion.sectionTitle !== question.sectionTitle;
              const review = response?.review;
              const questionComments =
                commentsByQuestion.get(question.id) ?? [];
              const topLevelComments = questionComments.filter(
                (comment) => !comment.parentId,
              );
              return (
                <div key={question.id} className="contents">
                  {showSectionHeader ? (
                    <h3 className="text-muted-foreground mt-4 border-b pb-1 text-xs font-semibold tracking-wide uppercase first:mt-0">
                      {question.sectionTitle}
                    </h3>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {question.sectionTitle}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {commonTranslations.has(`questionTypes.${question.type}`)
                        ? commonTranslations(`questionTypes.${question.type}`)
                        : question.type}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium">{question.text}</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {response?.isNotApplicable
                      ? translations("responses.notApplicable")
                      : formatResponseValue(response?.value)}
                  </p>
                  {(evidenceByQuestion.get(question.id) ?? []).map((item) => {
                    const isImage = /^image\//.test(item.mimeType);
                    const isPdf = item.mimeType === "application/pdf";
                    if (isImage) {
                      return (
                        <img
                          key={item.id}
                          src={`/api/files/${item.id}?inline=true`}
                          alt={
                            item.note ??
                            translations("responses.evidenceAlt", {
                              fileName: item.fileName,
                            })
                          }
                          loading="lazy"
                          width={400}
                          height={256}
                          className="mt-2 max-h-64 rounded-md border object-contain"
                        />
                      );
                    }
                    return (
                      <div key={item.id} className="mt-1 flex items-center">
                        <a
                          href={`/api/files/${item.id}?inline=true`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-xs hover:underline"
                        >
                          {isPdf
                            ? translations("responses.viewPdf", {
                                fileName: item.fileName,
                              })
                            : item.fileName}
                        </a>
                        <EvidencePreview
                          evidenceId={item.id}
                          fileName={item.fileName}
                          mimeType={item.mimeType}
                        >
                          <span />
                        </EvidencePreview>
                      </div>
                    );
                  })}
                  {canEditVendor &&
                  (evidenceByQuestion.get(question.id) ?? []).length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-muted-foreground text-xs">
                        {translations("responses.attachToVendor")}
                      </span>
                      {(evidenceByQuestion.get(question.id) ?? []).map(
                        (item) => (
                          <AttachEvidenceButton
                            key={item.id}
                            evidenceId={item.id}
                            fileName={item.fileName}
                          />
                        ),
                      )}
                    </div>
                  ) : null}
                  <ReviewPanel
                    assessmentId={assessment.id}
                    questionId={question.id}
                    responseId={response?.id ?? null}
                    review={
                      review
                        ? { decision: review.decision, note: review.note }
                        : null
                    }
                    topLevelComments={topLevelComments.map((comment) => ({
                      id: comment.id,
                      authorName: comment.authorName,
                      body: comment.body,
                      visibility: comment.visibility,
                      createdAt: comment.createdAt.toISOString(),
                    }))}
                    replies={repliesRecord}
                    canReview={canReview}
                    isReviewable={isReviewable}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
