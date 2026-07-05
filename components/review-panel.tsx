"use client";

import { useState } from "react";
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
import { addCommentAction, reviewAction } from "@/lib/actions/collaboration";
import { formatDate } from "@/lib/utils";

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
  const [expanded, setExpanded] = useState(false);

  const totalCommentCount =
    topLevelComments.length +
    Object.values(replies).reduce((sum, list) => sum + list.length, 0);

  const hasReview = review !== null && review !== undefined;
  const hasComments = totalCommentCount > 0;

  const summaryParts: string[] = [];
  if (hasReview) {
    const label =
      review.decision === "CLARIFICATION_REQUESTED"
        ? "Clarification requested"
        : review.decision.toLowerCase();
    summaryParts.push(label);
    if (review.note) {
      summaryParts.push(review.note);
    }
  }
  if (hasComments) {
    summaryParts.push(
      `${totalCommentCount} comment${totalCommentCount > 1 ? "s" : ""}`,
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
            {review.decision === "CLARIFICATION_REQUESTED"
              ? "Clarification requested"
              : review.decision.toLowerCase()}
          </Badge>
        ) : null}
        {!expanded && summaryParts.length > 0 ? (
          <span className="text-muted-foreground truncate text-xs">
            {summaryParts.join(" — ")}
          </span>
        ) : null}
        {!hasReview && !hasComments && !expanded ? (
          isReviewable && canReview ? (
            <span className="text-muted-foreground text-xs">No review yet</span>
          ) : null
        ) : null}
        {canReview || hasReview || hasComments ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-xs"
            onClick={() => setExpanded((p) => !p)}
          >
            {expanded ? (
              <>
                <ChevronUp className="size-3" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="size-3" />
                Expand
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
                  <SelectValue placeholder="Review" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVED">Approve</SelectItem>
                  <SelectItem value="CLARIFICATION_REQUESTED">
                    Request clarification
                  </SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                name="note"
                placeholder="Optional note (visible to vendor if clarification requested)"
                className="h-16 min-h-16 text-xs"
                rows={3}
              />
              <Button type="submit" size="sm">
                Save
              </Button>
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
                  · {formatDate(comment.createdAt)}
                </span>
                {comment.visibility === "VENDOR" ? (
                  <span className="rounded border border-[var(--rag-green)]/30 px-1 text-[10px] text-[var(--rag-green)]">
                    vendor
                  </span>
                ) : (
                  <span className="text-muted-foreground/50 rounded border px-1 text-[10px]">
                    internal
                  </span>
                )}
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
                      · {formatDate(reply.createdAt)}
                    </span>
                    {reply.visibility === "VENDOR" ? (
                      <span className="rounded border border-[var(--rag-green)]/30 px-1 text-[10px] text-[var(--rag-green)]">
                        vendor
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50 rounded border px-1 text-[10px]">
                        internal
                      </span>
                    )}
                  </p>
                  <p className="text-sm">{reply.body}</p>
                </div>
              ))}
              {canReview ? (
                <form action={addCommentAction} className="mt-1 flex gap-2">
                  <input
                    type="hidden"
                    name="assessmentId"
                    value={assessmentId}
                  />
                  <input
                    type="hidden"
                    name="assessmentQuestionId"
                    value={questionId}
                  />
                  <input type="hidden" name="parentId" value={comment.id} />
                  <input
                    name="body"
                    placeholder="Reply"
                    required
                    className="border-input bg-background h-8 flex-1 rounded-md border px-2 text-xs"
                  />
                  <Select name="visibility" defaultValue="INTERNAL">
                    <SelectTrigger className="h-8 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INTERNAL">Internal</SelectItem>
                      <SelectItem value="VENDOR">Visible to vendor</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit" size="sm" variant="ghost">
                    Reply
                  </Button>
                </form>
              ) : null}
            </div>
          ))}

          {canReview ? (
            <form action={addCommentAction} className="mt-1 flex gap-2">
              <input type="hidden" name="assessmentId" value={assessmentId} />
              <input
                type="hidden"
                name="assessmentQuestionId"
                value={questionId}
              />
              <input
                name="body"
                placeholder="Add a comment"
                required
                className="border-input bg-background h-8 flex-1 rounded-md border px-2 text-xs"
              />
              <Select name="visibility" defaultValue="INTERNAL">
                <SelectTrigger className="h-8 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERNAL">Internal</SelectItem>
                  <SelectItem value="VENDOR">Visible to vendor</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" size="sm" variant="ghost">
                Comment
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
