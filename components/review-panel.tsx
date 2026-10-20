"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { addCommentAction, reviewAction } from "@/lib/actions/collaboration";

const REVIEW_DECISION_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  APPROVED: "default",
  CLARIFICATION_REQUESTED: "destructive",
};

type ReviewData = {
  decision: string;
  note: string | null;
} | null;

type CommentData = {
  id: string;
  authorName: string;
  body: string;
  visibility: string;
  createdAt: string;
};

type ReviewPanelProps = {
  assessmentId: string;
  questionId: string;
  responseId: string | null;
  review: ReviewData;
  topLevelComments: CommentData[];
  replies: Record<string, CommentData[]>;
  canReview: boolean;
  isReviewable: boolean;
};

function VisibilityBadge({ visibility }: { visibility: string }) {
  const translations = useTranslations("Assessments.detail.review");
  if (visibility === "VENDOR") {
    return (
      <span className="rounded border border-[var(--rag-green)]/30 px-1 text-[10px] text-[var(--rag-green)]">
        {translations("vendor")}
      </span>
    );
  }
  return (
    <span className="text-muted-foreground/50 rounded border px-1 text-[10px]">
      {translations("internal")}
    </span>
  );
}

type CommentComposerProps = {
  assessmentId: string;
  questionId: string;
  parentId?: string;
  placeholder: string;
  submitLabel: string;
};

function CommentComposer({
  assessmentId,
  questionId,
  parentId,
  placeholder,
  submitLabel,
}: CommentComposerProps) {
  const translations = useTranslations("Assessments.detail.review");

  return (
    <form action={addCommentAction} className="mt-1 flex gap-2">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <input type="hidden" name="assessmentQuestionId" value={questionId} />
      {parentId ? (
        <input type="hidden" name="parentId" value={parentId} />
      ) : null}
      <input
        name="body"
        placeholder={placeholder}
        required
        className="border-input bg-background h-8 flex-1 rounded-md border px-2 text-xs"
      />
      <Select name="visibility" defaultValue="INTERNAL">
        <SelectTrigger className="h-8 w-24 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="INTERNAL">
            {translations("internalOption")}
          </SelectItem>
          <SelectItem value="VENDOR">{translations("vendorOption")}</SelectItem>
        </SelectContent>
      </Select>
      <SubmitButton type="submit" size="sm" variant="ghost">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}

export function ReviewPanel({
  assessmentId,
  questionId,
  responseId,
  review,
  topLevelComments,
  replies,
  canReview,
  isReviewable,
}: ReviewPanelProps) {
  const translations = useTranslations("Assessments.detail.review");
  const dateFormatter = useFormatter();
  const [expanded, setExpanded] = useState(false);

  function decisionLabel(decision: string): string {
    if (decision === "APPROVED") {
      return translations("approved");
    }
    if (decision === "CLARIFICATION_REQUESTED") {
      return translations("clarificationRequested");
    }
    return decision.toLowerCase();
  }

  let replyCount = 0;
  for (const replyList of Object.values(replies)) {
    replyCount += replyList.length;
  }
  const totalCommentCount = topLevelComments.length + replyCount;

  const hasReview = review !== null && review !== undefined;
  const hasComments = totalCommentCount > 0;

  const summaryParts: string[] = [];
  if (hasReview) {
    summaryParts.push(decisionLabel(review.decision));
    if (review.note) {
      summaryParts.push(review.note);
    }
  }
  if (hasComments) {
    summaryParts.push(
      translations("commentCount", { count: totalCommentCount }),
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {hasReview ? (
          <Badge
            variant={REVIEW_DECISION_VARIANT[review.decision] ?? "secondary"}
            className="text-xs"
          >
            {decisionLabel(review.decision)}
          </Badge>
        ) : null}
        {!expanded && summaryParts.length > 0 ? (
          <span className="text-muted-foreground truncate text-xs">
            {summaryParts.join(" — ")}
          </span>
        ) : null}
        {!hasReview && !hasComments && !expanded ? (
          isReviewable && canReview ? (
            <span className="text-muted-foreground text-xs">
              {translations("noReviewYet")}
            </span>
          ) : null
        ) : null}
        {canReview || hasReview || hasComments ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-xs"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? (
              <>
                <ChevronUp className="size-3" />
                {translations("collapse")}
              </>
            ) : (
              <>
                <ChevronDown className="size-3" />
                {translations("expand")}
              </>
            )}
          </Button>
        ) : null}
      </div>

      {expanded ? (
        <div className="flex flex-col gap-2">
          {isReviewable && canReview && responseId ? (
            <form action={reviewAction} className="flex items-end gap-2">
              <input type="hidden" name="assessmentId" value={assessmentId} />
              <input type="hidden" name="responseId" value={responseId} />
              <Select name="decision" required>
                <SelectTrigger className="h-8 w-48 text-xs">
                  <SelectValue
                    placeholder={translations("reviewPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVED">
                    {translations("approve")}
                  </SelectItem>
                  <SelectItem value="CLARIFICATION_REQUESTED">
                    {translations("requestClarification")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                name="note"
                placeholder={translations("notePlaceholder")}
                className="h-16 min-h-16 text-xs"
                rows={3}
              />
              <SubmitButton type="submit" size="sm">
                {translations("save")}
              </SubmitButton>
            </form>
          ) : review ? (
            <div className="flex items-center gap-2">
              {review.note ? (
                <span className="text-muted-foreground text-xs">
                  {review.note}
                </span>
              ) : null}
            </div>
          ) : null}

          {topLevelComments.map((comment) => (
            <div key={comment.id} className="border-muted border-l-2 pl-3">
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                {comment.authorName}{" "}
                <span className="text-muted-foreground/50">
                  ·{" "}
                  {dateFormatter.dateTime(new Date(comment.createdAt), {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <VisibilityBadge visibility={comment.visibility} />
              </p>
              <p className="text-sm">{comment.body}</p>
              {(replies[comment.id] ?? []).map((reply) => (
                <div
                  key={reply.id}
                  className="border-muted mt-1 border-l-2 pl-3"
                >
                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    {reply.authorName}{" "}
                    <span className="text-muted-foreground/50">
                      ·{" "}
                      {dateFormatter.dateTime(new Date(reply.createdAt), {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <VisibilityBadge visibility={reply.visibility} />
                  </p>
                  <p className="text-sm">{reply.body}</p>
                </div>
              ))}
              {canReview ? (
                <CommentComposer
                  assessmentId={assessmentId}
                  questionId={questionId}
                  parentId={comment.id}
                  placeholder={translations("replyPlaceholder")}
                  submitLabel={translations("reply")}
                />
              ) : null}
            </div>
          ))}

          {canReview ? (
            <CommentComposer
              assessmentId={assessmentId}
              questionId={questionId}
              placeholder={translations("commentPlaceholder")}
              submitLabel={translations("comment")}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
