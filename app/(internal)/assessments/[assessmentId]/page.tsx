import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

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
  ASSESSMENT_STATUS_LABELS,
  FINDING_STATUS_LABELS,
  FINDING_STATUS_STYLES,
  SEVERITY_ACCENT,
  SEVERITY_STYLES,
} from "@/lib/schemas/assessment";
import { QUESTION_TYPE_LABELS } from "@/lib/schemas/template";
import { cn, formatDate, formatResponseValue } from "@/lib/utils";

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
  if (!assessment) return { title: "Assessment not found" };
  return { title: assessment.title };
}

export default async function AssessmentDetailPage({
  params,
  searchParams,
}: AssessmentDetailPageProps) {
  const user = await requirePermission(PERMISSIONS.ASSESSMENTS_VIEW);
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

  const sp = await searchParams;
  const reviewFilter = sp.review ?? "all";

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
      (r) => r.review?.decision === "CLARIFICATION_REQUESTED",
    ).length,
    pending: answerable.filter((response) => !response.review).length,
  };

  const openFindings = assessment.findings.filter(
    (f) => f.status === "OPEN",
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
    { value: "all", label: "All" },
    { value: "pending", label: `Pending (${reviewCounts.pending})` },
    { value: "approved", label: `Approved (${reviewCounts.approved})` },
    {
      value: "clarification",
      label: `Clarification (${reviewCounts.clarification})`,
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
    const list = evidenceByQuestion.get(item.assessmentQuestionId) ?? [];
    list.push(item);
    evidenceByQuestion.set(item.assessmentQuestionId, list);
  }
  const commentsByQuestion = new Map<string, typeof assessment.comments>();
  const replyByParentId = new Map<string, typeof assessment.comments>();
  for (const comment of assessment.comments) {
    const questionId = comment.assessmentQuestionId ?? "";
    const list = commentsByQuestion.get(questionId) ?? [];
    list.push(comment);
    commentsByQuestion.set(questionId, list);
    if (comment.parentId) {
      const replies = replyByParentId.get(comment.parentId) ?? [];
      replies.push(comment);
      replyByParentId.set(comment.parentId, replies);
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
    repliesRecord[parentId] = replies.map((response) => ({
      id: response.id,
      authorName: response.authorName,
      body: response.body,
      visibility: response.visibility,
      createdAt: response.createdAt.toISOString(),
    }));
  }

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: "Vendors", href: "/vendors" },
          {
            label: assessment.vendor.name,
            href: `/vendors/${assessment.vendorId}`,
          },
          { label: assessment.title },
        ]}
      />
      <div>
        <div className="mt-2 flex flex-col gap-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {assessment.title}
            <Badge variant="secondary">
              {ASSESSMENT_STATUS_LABELS[assessment.status]}
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
                    Reopen review
                  </Button>
                </form>
                <SendBackDialog assessmentId={assessment.id} />
              </>
            ) : null}
            <Button asChild variant="outline" size="sm">
              <a href={`/api/assessments/${assessment.id}/export`} download>
                Export CSV
              </a>
            </Button>
            {assessment.status === "SUBMITTED" ||
            assessment.status === "UNDER_REVIEW" ||
            assessment.status === "COMPLETED" ? (
              <Button asChild variant="outline" size="sm">
                <a
                  href={`/api/assessments/${assessment.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download PDF
                </a>
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
                  title="Delete assessment?"
                  description={`This will permanently delete "${assessment.title}" and all responses, findings, and evidence. This action cannot be undone.`}
                  formId={`delete-assessment-${assessment.id}`}
                >
                  <Button type="button" variant="outline">
                    Delete
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
          {assessment.dueDate ? ` · due ${formatDate(assessment.dueDate)}` : ""}
          {assessment.reviewer ? ` · reviewer ${assessment.reviewer.name}` : ""}
        </p>
      </div>

      {isDraft && canCreate ? (
        <Card>
          <CardHeader>
            <CardTitle>Send questionnaire</CardTitle>
            <CardDescription>
              Generate a no‑login portal link for the vendor. Optionally set a
              password to protect access.
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
            <CardTitle>Vendor link (no login required)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <CopyLink value={portalUrl} />
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-muted-foreground text-xs">
                {assessment.tokenExpiresAt
                  ? `Expires ${formatDate(assessment.tokenExpiresAt)}`
                  : "No expiry"}
              </p>
              {assessment.portalPasswordHash ? (
                <Badge variant="secondary" className="text-xs">
                  Password protected
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
                    Extend 30 days
                  </Button>
                </form>
                <form action={regenerateAssessmentAction}>
                  <input
                    type="hidden"
                    name="assessmentId"
                    value={assessment.id}
                  />
                  <Button type="submit" variant="outline" size="sm">
                    Regenerate link
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
                    title="Revoke portal link?"
                    description="The vendor will no longer be able to access the questionnaire. You can regenerate the link later if needed."
                    confirmLabel="Revoke"
                    variant="destructive"
                    formId={`revoke-${assessment.id}`}
                  >
                    <Button type="button" variant="ghost" size="sm">
                      Revoke
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
            <CardTitle>Vendor link</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm">
              The link has been revoked.
            </p>
            {canEdit ? (
              <form action={regenerateAssessmentAction}>
                <input
                  type="hidden"
                  name="assessmentId"
                  value={assessment.id}
                />
                <Button type="submit" variant="outline" size="sm">
                  Regenerate link
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {assessment.score !== null ? (
        <Card>
          <CardHeader>
            <CardTitle>Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-baseline gap-3">
              <ScoreBadge score={assessment.score} size="lg" />
              <span className="text-muted-foreground text-sm">
                {assessment.score >= 0.85
                  ? "Low risk"
                  : assessment.score >= 0.6
                    ? "Moderate risk"
                    : "High risk"}
              </span>
            </div>
            <div>
              <ProgressBar
                value={Math.round(assessment.score * 100)}
                className={cn(
                  assessment.score >= 0.85
                    ? "bg-[var(--rag-green)]"
                    : assessment.score >= 0.6
                      ? "bg-[var(--rag-amber)]"
                      : "bg-[var(--rag-red)]",
                )}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {assessment.findings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Findings ({assessment.findings.length} · {openFindings} open)
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
                      {finding.severity}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                        FINDING_STATUS_STYLES[finding.status] ??
                          "bg-muted text-muted-foreground",
                      )}
                    >
                      {FINDING_STATUS_LABELS[finding.status] ?? finding.status}
                    </span>
                    <span className="text-sm font-medium">{finding.title}</span>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {finding.description}
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
                      {finding.resolvedBy?.name ?? "Deleted user"}
                      {finding.resolvedAt
                        ? ` · ${formatDate(finding.resolvedAt)}`
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
            <CardTitle>Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              All answers compliant — no findings.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {assessment.questions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Responses</CardTitle>
            {reviewCounts.total > 0 ? (
              <CardDescription>
                {reviewCounts.approved} of {reviewCounts.total} approved ·{" "}
                {reviewCounts.pending} pending
                {reviewCounts.clarification > 0
                  ? ` · ${reviewCounts.clarification} clarification`
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
            {assessment.questions.map((question) => {
              const response = responsesByQuestion.get(question.id);
              if (!matchesReviewFilter(response)) {
                return null;
              }
              const review = response?.review;
              const questionComments =
                commentsByQuestion.get(question.id) ?? [];
              const topLevelComments = questionComments.filter(
                (comment) => !comment.parentId,
              );

              return (
                <div key={question.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {question.sectionTitle}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {QUESTION_TYPE_LABELS[question.type]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium">{question.text}</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {response?.isNotApplicable
                      ? "N/A"
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
                          alt={item.note ?? `Evidence file: ${item.fileName}`}
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
                            ? `View PDF: ${item.fileName} ↗`
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
                        Attach to vendor
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
