"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProgressBar } from "@/components/progress-bar";
import {
  removePortalEvidenceAction,
  saveProgressAction,
  submitPortalAction,
  uploadEvidenceAction,
  vendorAddCommentAction,
} from "@/lib/actions/portal";
import { formatDate } from "@/lib/utils";
import {
  isQuestionVisible,
  type PortalAnswers,
  type PortalAnswerValue,
} from "@/lib/portal";

type PortalQuestion = {
  id: string;
  sectionTitle: string;
  text: string;
  helpText: string | null;
  type: string;
  required: boolean;
  options: string[];
  conditionalLogic: unknown;
};

type PortalInitialAnswer = {
  assessmentQuestionId: string;
  value: string | number | boolean | string[] | null;
  isNotApplicable: boolean;
};

type PortalEvidence = {
  id: string;
  fileName: string;
  assessmentQuestionId: string | null;
};

type PortalComment = {
  id: string;
  assessmentQuestionId: string | null;
  authorType: string;
  authorName: string;
  body: string;
  createdAt: Date;
};

type PortalReview = {
  decision: string;
  note: string | null;
};

type PortalQuestionnaireProps = {
  token: string;
  title: string;
  vendorName: string;
  tokenExpiresAt: string | null;
  questions: PortalQuestion[];
  initialAnswers: PortalInitialAnswer[];
  initialEvidence: PortalEvidence[];
  reviewByQuestionId?: Record<string, PortalReview>;
  initialComments?: PortalComment[];
  maxUploadMb?: number;
  allowedExtensions?: string[];
};

type EvidenceMap = Record<string, { id: string; fileName: string }[]>;

const AUTOSAVE_DELAY_MS = 800;

function buildInitialAnswers(initial: PortalInitialAnswer[]): PortalAnswers {
  const answers: PortalAnswers = {};
  for (const item of initial) {
    answers[item.assessmentQuestionId] = {
      value: item.value,
      isNotApplicable: item.isNotApplicable,
    };
  }
  return answers;
}

function buildInitialEvidence(initial: PortalEvidence[]): EvidenceMap {
  const map: EvidenceMap = {};
  for (const item of initial) {
    if (!item.assessmentQuestionId) {
      continue;
    }
    const list = map[item.assessmentQuestionId] ?? [];
    list.push({ id: item.id, fileName: item.fileName });
    map[item.assessmentQuestionId] = list;
  }
  return map;
}

export function PortalQuestionnaire({
  token,
  title,
  vendorName,
  tokenExpiresAt,
  questions,
  initialAnswers,
  initialEvidence,
  reviewByQuestionId = {},
  initialComments = [],
  maxUploadMb = 20,
  allowedExtensions = ["pdf", "docx", "xlsx"],
}: PortalQuestionnaireProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<PortalAnswers>(() =>
    buildInitialAnswers(initialAnswers),
  );
  const [evidence, setEvidence] = useState<EvidenceMap>(() =>
    buildInitialEvidence(initialEvidence),
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isFirstRender = useRef(true);

  const [comments, setComments] = useState<PortalComment[]>(initialComments);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [sendingComment, setSendingComment] = useState(false);
  const [expiryLabel, setExpiryLabel] = useState<string | null>(null);

  async function handleVendorComment(questionId: string) {
    const body = commentText[questionId]?.trim();
    if (!body) {
      return;
    }
    setSendingComment(true);
    const result = await vendorAddCommentAction(token, questionId, body);
    if (result.ok) {
      setComments((previous) => [
        ...previous,
        {
          id: `local-${Date.now()}`,
          assessmentQuestionId: questionId,
          authorType: "VENDOR",
          authorName: "Vendor",
          body,
          createdAt: new Date(),
        },
      ]);
      setCommentText((previous) => ({ ...previous, [questionId]: "" }));
    }
    setSendingComment(false);
  }

  async function handleRemoveEvidence(evidenceId: string, questionId: string) {
    setEvidence((current) => ({
      ...current,
      [questionId]: (current[questionId] ?? []).filter(
        (f) => f.id !== evidenceId,
      ),
    }));
    await removePortalEvidenceAction(evidenceId, token);
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const handle = window.setTimeout(async () => {
      setSaveStatus("saving");
      const payload = Object.entries(answers).map(
        ([assessmentQuestionId, answer]) => ({
          assessmentQuestionId,
          value: answer.value,
          isNotApplicable: answer.isNotApplicable,
        }),
      );
      const result = await saveProgressAction(token, payload);
      setSaveStatus(result.ok ? "saved" : "idle");
      if (result.ok) {
        const now = new Date();
        setLastSavedAt(
          `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
        );
      }
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(handle);
  }, [answers, token]);

  // Token expiry countdown — updates every minute.
  useEffect(() => {
    if (!tokenExpiresAt) return;
    function update() {
      const remaining = new Date(tokenExpiresAt!).getTime() - Date.now();
      if (remaining <= 0) {
        setExpiryLabel("This link has expired.");
        return;
      }
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      if (hours > 24) {
        setExpiryLabel(null);
        return;
      }
      if (hours > 0) {
        setExpiryLabel(
          `This link expires in ${hours} hour${hours > 1 ? "s" : ""}.`,
        );
      } else {
        setExpiryLabel(
          `This link expires in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
        );
      }
    }
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [tokenExpiresAt]);

  const sections = useMemo(() => {
    const map = new Map<string, PortalQuestion[]>();
    for (const question of questions) {
      const list = map.get(question.sectionTitle) ?? [];
      list.push(question);
      map.set(question.sectionTitle, list);
    }
    return [...map.entries()];
  }, [questions]);

  function setAnswer(questionId: string, partial: Partial<PortalAnswerValue>) {
    setAnswers((current) => {
      const existing = current[questionId] ?? {
        value: null,
        isNotApplicable: false,
      };
      return { ...current, [questionId]: { ...existing, ...partial } };
    });
  }

  async function handleFileUpload(
    questionId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setUploadError(null);
    const formData = new FormData();
    formData.set("token", token);
    formData.set("assessmentQuestionId", questionId);
    formData.set("file", file);

    const result = await uploadEvidenceAction(formData);
    if (result.ok) {
      setEvidence((current) => ({
        ...current,
        [questionId]: [
          ...(current[questionId] ?? []),
          { id: result.evidence.id, fileName: result.evidence.fileName },
        ],
      }));
      setAnswer(questionId, { value: result.evidence.fileName });
    } else {
      setUploadError(result.error);
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmitError(null);

    const payload = Object.entries(answers).map(
      ([assessmentQuestionId, answer]) => ({
        assessmentQuestionId,
        value: answer.value,
        isNotApplicable: answer.isNotApplicable,
      }),
    );
    await saveProgressAction(token, payload);

    const result = await submitPortalAction(token);
    if (result.ok) {
      router.refresh();
      return;
    }

    setIsSubmitting(false);
    setSubmitError(
      result.missing > 0
        ? `Please answer ${result.missing} required question(s) before submitting.`
        : "This link is no longer valid.",
    );
  }

  function renderInput(question: PortalQuestion) {
    const answer = answers[question.id] ?? {
      value: null,
      isNotApplicable: false,
    };
    const disabled = answer.isNotApplicable;
    const { value } = answer;

    if (question.type === "YES_NO") {
      return (
        <RadioGroup
          value={typeof value === "string" ? value : ""}
          onValueChange={(v) => setAnswer(question.id, { value: v })}
          disabled={disabled}
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="YES" id={`${question.id}-yes`} />
            <Label htmlFor={`${question.id}-yes`}>Yes</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="NO" id={`${question.id}-no`} />
            <Label htmlFor={`${question.id}-no`}>No</Label>
          </div>
        </RadioGroup>
      );
    }

    if (question.type === "MULTIPLE_CHOICE") {
      return (
        <RadioGroup
          value={typeof value === "string" ? value : ""}
          onValueChange={(v) => setAnswer(question.id, { value: v })}
          disabled={disabled}
        >
          {question.options.map((option) => (
            <div key={option} className="flex items-center gap-2">
              <RadioGroupItem value={option} id={`${question.id}-${option}`} />
              <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
            </div>
          ))}
        </RadioGroup>
      );
    }

    if (question.type === "FREE_TEXT") {
      return (
        <Textarea
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(event) =>
            setAnswer(question.id, { value: event.target.value })
          }
        />
      );
    }

    if (question.type === "NUMERIC") {
      return (
        <Input
          type="number"
          className="max-w-xs"
          disabled={disabled}
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(event) =>
            setAnswer(question.id, {
              value:
                event.target.value === "" ? null : Number(event.target.value),
            })
          }
        />
      );
    }

    if (question.type === "DATE") {
      return (
        <Input
          type="date"
          className="max-w-xs"
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(event) =>
            setAnswer(question.id, { value: event.target.value })
          }
        />
      );
    }

    if (question.type === "FILE_UPLOAD") {
      return (
        <div className="flex flex-col gap-2">
          <Input
            type="file"
            disabled={disabled}
            onChange={(event) => handleFileUpload(question.id, event)}
          />
          <p className="text-muted-foreground text-xs">
            Max {maxUploadMb} MB. Allowed: {allowedExtensions.join(", ")}.
          </p>
          {(evidence[question.id] ?? []).map((file) => (
            <span
              key={file.id}
              className="text-muted-foreground flex items-center gap-2 text-xs"
            >
              Uploaded: {file.fileName}
              <button
                type="button"
                className="text-destructive hover:underline"
                onClick={() => handleRemoveEvidence(file.id, question.id)}
              >
                Remove
              </button>
            </span>
          ))}
        </div>
      );
    }

    if (question.type === "COMBOBOX") {
      return (
        <Select
          value={typeof value === "string" ? value : ""}
          onValueChange={(v) => setAnswer(question.id, { value: v })}
          disabled={disabled}
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {question.options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (question.type === "MULTI_SELECT") {
      const selected: string[] = Array.isArray(value)
        ? (value as string[])
        : [];
      return (
        <div className="flex flex-col gap-2">
          {question.options.map((option) => {
            const isChecked = selected.includes(option);
            return (
              <div key={option} className="flex items-center gap-2">
                <Checkbox
                  id={`${question.id}-${option}`}
                  checked={isChecked}
                  disabled={disabled}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...selected, option]
                      : selected.filter((v) => v !== option);
                    setAnswer(question.id, { value: next });
                  }}
                />
                <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
              </div>
            );
          })}
        </div>
      );
    }

    if (question.type === "RATING") {
      return (
        <RadioGroup
          value={value !== null && value !== undefined ? String(value) : ""}
          onValueChange={(v) => setAnswer(question.id, { value: Number(v) })}
          disabled={disabled}
          className="flex gap-3"
        >
          {[1, 2, 3, 4, 5].map((rating) => (
            <div key={rating} className="flex items-center gap-1">
              <RadioGroupItem
                value={String(rating)}
                id={`${question.id}-${rating}`}
              />
              <Label htmlFor={`${question.id}-${rating}`}>{rating}</Label>
            </div>
          ))}
        </RadioGroup>
      );
    }

    if (question.type === "URL") {
      return (
        <Input
          type="url"
          className="max-w-xs"
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(event) =>
            setAnswer(question.id, { value: event.target.value })
          }
          placeholder="https://"
        />
      );
    }

    if (question.type === "EMAIL") {
      return (
        <Input
          type="email"
          className="max-w-xs"
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(event) =>
            setAnswer(question.id, { value: event.target.value })
          }
          placeholder="name@example.com"
        />
      );
    }

    if (question.type === "CHECKBOX") {
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={`${question.id}-checkbox`}
            checked={Boolean(value)}
            disabled={disabled}
            onCheckedChange={(checked) =>
              setAnswer(question.id, { value: checked })
            }
          />
          <Label htmlFor={`${question.id}-checkbox`}>
            I confirm this statement
          </Label>
        </div>
      );
    }

    return null;
  }

  const visibleQuestions = questions.filter((q) =>
    isQuestionVisible(q.conditionalLogic, answers),
  );

  const totalQuestions = visibleQuestions.length;
  const answeredCount = visibleQuestions.filter((q) => {
    const answer = answers[q.id];
    if (!answer) return false;
    if (answer.isNotApplicable) return true;
    return (
      answer.value !== null && answer.value !== undefined && answer.value !== ""
    );
  }).length;

  const expiresLabel = tokenExpiresAt
    ? `Expires ${formatDate(tokenExpiresAt)}`
    : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted-foreground text-sm">{vendorName}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-xs">
              {saveStatus === "saving"
                ? "Saving…"
                : saveStatus === "saved" && lastSavedAt
                  ? `Saved at ${lastSavedAt}`
                  : lastSavedAt
                    ? `Last saved at ${lastSavedAt}`
                    : ""}
            </span>
            <ThemeToggle />
          </div>
        </div>
        <div className="bg-accent/30 rounded-md border px-4 py-2.5">
          <p className="text-muted-foreground text-xs">
            Your answers are saved automatically. You can close this page and
            return using the same link at any time to pick up where you left
            off.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ProgressBar
            className="bg-primary"
            value={
              totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0
            }
          />
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {answeredCount}/{totalQuestions}
          </span>
          {expiresLabel ? (
            <span className="text-muted-foreground shrink-0 text-xs">
              {expiresLabel}
            </span>
          ) : null}
        </div>
        {expiryLabel ? (
          <div className="rounded-md border border-[var(--rag-amber)] bg-[var(--rag-amber)]/10 px-4 py-2">
            <p className="text-muted-foreground text-xs font-medium">
              {expiryLabel}
            </p>
          </div>
        ) : null}
      </header>

      {sections.map(([sectionTitle, sectionQuestions]) => {
        const visible = sectionQuestions.filter((question) =>
          isQuestionVisible(question.conditionalLogic, answers),
        );
        if (visible.length === 0) {
          return null;
        }
        return (
          <section key={sectionTitle} className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">{sectionTitle}</h2>
            {visible.map((question) => {
              const answer = answers[question.id];
              return (
                <div
                  key={question.id}
                  className="flex flex-col gap-2 rounded-md border p-4 transition-all duration-300 ease-in-out"
                >
                  <div className="text-sm font-medium">
                    {question.text}
                    {question.required ? (
                      <span className="text-destructive"> *</span>
                    ) : null}
                  </div>
                  {question.helpText ? (
                    <p className="text-muted-foreground text-xs">
                      {question.helpText}
                    </p>
                  ) : null}
                  {(() => {
                    const review = reviewByQuestionId[question.id];
                    if (!review) {
                      return null;
                    }
                    if (review.decision !== "CLARIFICATION_REQUESTED") {
                      return null;
                    }
                    return (
                      <div className="bg-muted/50 rounded-md border-l-2 border-amber-500 p-2 text-sm">
                        <p className="text-xs font-medium">
                          The reviewer requested clarification on this answer.
                        </p>
                        {review.note ? (
                          <p className="text-muted-foreground mt-1 text-xs">
                            {review.note}
                          </p>
                        ) : null}
                      </div>
                    );
                  })()}
                  {renderInput(question)}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`${question.id}-na`}
                      checked={answer?.isNotApplicable ?? false}
                      onCheckedChange={(checked) =>
                        setAnswer(question.id, {
                          isNotApplicable: Boolean(checked),
                        })
                      }
                    />
                    <Label
                      htmlFor={`${question.id}-na`}
                      className="text-muted-foreground text-xs"
                    >
                      Not applicable
                    </Label>
                  </div>
                  {reviewByQuestionId[question.id]?.decision ===
                  "CLARIFICATION_REQUESTED"
                    ? (() => {
                        const questionComments = comments.filter(
                          (c) => c.assessmentQuestionId === question.id,
                        );
                        return (
                          <div className="flex flex-col gap-2">
                            {questionComments.map((c) => (
                              <div
                                key={c.id}
                                className="text-muted-foreground text-xs"
                              >
                                <span className="font-medium">
                                  {c.authorName}
                                </span>{" "}
                                · {c.body}
                              </div>
                            ))}
                            <div className="flex items-start gap-2">
                              <Textarea
                                className="min-h-16 text-xs"
                                placeholder="Add a comment…"
                                value={commentText[question.id] ?? ""}
                                onChange={(event) =>
                                  setCommentText((previous) => ({
                                    ...previous,
                                    [question.id]: event.target.value,
                                  }))
                                }
                                rows={2}
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={
                                  sendingComment ||
                                  !commentText[question.id]?.trim()
                                }
                                onClick={() => handleVendorComment(question.id)}
                              >
                                Send
                              </Button>
                            </div>
                          </div>
                        );
                      })()
                    : null}
                </div>
              );
            })}
          </section>
        );
      })}

      {uploadError ? (
        <p className="text-destructive text-sm" role="alert">
          {uploadError}
        </p>
      ) : null}
      {submitError ? (
        <p className="text-destructive text-sm" role="alert">
          {submitError}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting…" : "Submit questionnaire"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit questionnaire?</AlertDialogTitle>
              <AlertDialogDescription>
                You will not be able to edit your answers after submission. Are
                you sure you are ready to submit?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleSubmit()}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Submit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
