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
import ReactMarkdown from "react-markdown";
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
  findMissingRequiredQuestions,
  hasAnswer,
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

type VisibleSection = { title: string; questions: PortalQuestion[] };

// Ordered sections containing only questions whose conditional logic passes
// for the given answers — the basis for both rendering and step navigation.
function groupVisibleSections(
  questions: PortalQuestion[],
  answers: PortalAnswers,
): VisibleSection[] {
  const map = new Map<string, PortalQuestion[]>();
  for (const question of questions) {
    if (!isQuestionVisible(question.conditionalLogic, answers)) {
      continue;
    }
    const list = map.get(question.sectionTitle) ?? [];
    list.push(question);
    map.set(question.sectionTitle, list);
  }
  return [...map.entries()].map(([title, sectionQuestions]) => ({
    title,
    questions: sectionQuestions,
  }));
}

function isAnswered(answer: PortalAnswerValue | undefined): boolean {
  return hasAnswer(answer);
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
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingQuestion, setUploadingQuestion] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isFirstRender = useRef(true);

  // --- step navigation (multi-section questionnaires only) ---
  // Resume at the first section that still has an unanswered required
  // question; a fully-completed load lands on the first section.
  const [sectionCursor, setSectionCursor] = useState<number>(() => {
    const answersAtLoad = buildInitialAnswers(initialAnswers);
    const groups = groupVisibleSections(questions, answersAtLoad);
    if (groups.length <= 1) {
      return 0;
    }
    const firstIncomplete = groups.findIndex((group) =>
      group.questions.some(
        (question) =>
          question.required && !isAnswered(answersAtLoad[question.id]),
      ),
    );
    return firstIncomplete === -1 ? 0 : firstIncomplete;
  });
  const [showReview, setShowReview] = useState(false);
  const [continueWarned, setContinueWarned] = useState(false);
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<
    string | null
  >(null);

  const [comments, setComments] = useState<PortalComment[]>(initialComments);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [sendingComment, setSendingComment] = useState(false);
  const [expiryLabel, setExpiryLabel] = useState<string | null>(null);
  const [isLinkExpired, setIsLinkExpired] = useState(false);

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

  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  async function performSave() {
    setSaveStatus("saving");
    if (isLinkExpired) {
      // Nothing can be persisted on an expired link — surface it instead of
      // silently failing on every keystroke.
      setSaveStatus("error");
      return;
    }
    const payload = Object.entries(answersRef.current).map(
      ([assessmentQuestionId, answer]) => ({
        assessmentQuestionId,
        value: answer.value,
        isNotApplicable: answer.isNotApplicable,
      }),
    );
    const result = await saveProgressAction(token, payload);
    if (result.ok) {
      setSaveStatus("saved");
      const now = new Date();
      setLastSavedAt(
        `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
      );
    } else {
      setSaveStatus("error");
    }
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const handle = window.setTimeout(() => {
      void performSave();
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, token]);

  // Token expiry countdown — updates every minute.
  useEffect(() => {
    if (!tokenExpiresAt) return;
    function update() {
      const remaining = new Date(tokenExpiresAt!).getTime() - Date.now();
      if (remaining <= 0) {
        setExpiryLabel("This link has expired.");
        setIsLinkExpired(true);
        return;
      }
      setIsLinkExpired(false);
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

  // Sections containing only currently-visible questions — the step list for
  // multi-section questionnaires. Hidden questions drop out automatically, so
  // fully-gated sections disappear from navigation.
  const steppedSections = useMemo(
    () => groupVisibleSections(questions, answers),
    [questions, answers],
  );
  const isStepped = steppedSections.length > 1;

  function setAnswer(questionId: string, partial: Partial<PortalAnswerValue>) {
    setAnswers((current) => {
      const existing = current[questionId] ?? {
        value: null,
        isNotApplicable: false,
      };
      return { ...current, [questionId]: { ...existing, ...partial } };
    });
    if (highlightedQuestionId) {
      setHighlightedQuestionId(null);
    }
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
    setUploadingQuestion(questionId);
    const formData = new FormData();
    formData.set("token", token);
    formData.set("assessmentQuestionId", questionId);
    formData.set("file", file);

    const result = await uploadEvidenceAction(formData);
    setUploadingQuestion(null);
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

    if (result.missingQuestionIds.length > 0) {
      setSubmitError(
        `Please answer ${result.missing} required question(s) before submitting.`,
      );
      // Jump to the section containing the first missing answer and highlight
      // it so the vendor never has to hunt.
      const firstMissingId = result.missingQuestionIds[0]!;
      const ownerIndex = steppedSections.findIndex((group) =>
        group.questions.some((question) => question.id === firstMissingId),
      );
      if (ownerIndex !== -1) {
        setSectionCursor(ownerIndex);
        setShowReview(false);
        setContinueWarned(false);
      }
      setHighlightedQuestionId(firstMissingId);
      return;
    }

    setSubmitError("This link is no longer valid.");
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
      const isUploading = uploadingQuestion === question.id;
      const accept = allowedExtensions.map((ext) => `.${ext}`).join(",");
      return (
        <div className="flex flex-col gap-2">
          <Input
            type="file"
            accept={accept}
            disabled={disabled || isUploading}
            onChange={(event) => handleFileUpload(question.id, event)}
          />
          <p className="text-muted-foreground text-xs">
            Max {maxUploadMb} MB. Allowed: {allowedExtensions.join(", ")}.
            {isUploading ? " Uploading…" : null}
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
                      : selected.filter((value) => value !== option);
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

  // Smooth-scroll to and highlight the first unanswered required question
  // after a failed submit attempt.
  useEffect(() => {
    if (!highlightedQuestionId) return;
    document
      .getElementById(`question-${highlightedQuestionId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightedQuestionId]);

  // Long steps start at the top of the form, not wherever the vendor was.
  useEffect(() => {
    if (!isStepped) return;
    window.scrollTo({ top: 0 });
  }, [sectionCursor, showReview, isStepped]);

  function renderQuestionCard(question: PortalQuestion) {
    const answer = answers[question.id];
    const isHighlighted = highlightedQuestionId === question.id;
    return (
      <div
        key={question.id}
        id={`question-${question.id}`}
        className={`flex flex-col gap-2 rounded-md border p-4 transition-all duration-300 ease-in-out ${
          isHighlighted ? "ring-destructive ring-2" : ""
        }`}
      >
        <div className="text-sm font-medium">
          {question.text}
          {question.required ? (
            <span className="text-destructive"> *</span>
          ) : null}
        </div>
        {question.helpText ? (
          <div className="text-muted-foreground prose prose-xs dark:prose-invert max-w-none text-xs">
            <ReactMarkdown>{question.helpText}</ReactMarkdown>
          </div>
        ) : null}
        {(() => {
          const review = reviewByQuestionId[question.id];
          if (!review || review.decision !== "CLARIFICATION_REQUESTED") {
            return null;
          }
          return (
            <div className="bg-muted/50 rounded-md border-l-2 border-[var(--rag-amber)] p-2 text-sm">
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
        {(() => {
          const questionComments = comments.filter(
            (c) => c.assessmentQuestionId === question.id,
          );
          const isClarifying =
            reviewByQuestionId[question.id]?.decision ===
            "CLARIFICATION_REQUESTED";
          if (questionComments.length === 0 && !isClarifying) {
            return null;
          }
          return (
            <div className="flex flex-col gap-2">
              {questionComments.length > 0
                ? questionComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="text-muted-foreground text-xs"
                    >
                      <span className="font-medium">{comment.authorName}</span>·{" "}
                      {comment.body}
                    </div>
                  ))
                : null}
              {isClarifying ? (
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
                      sendingComment || !commentText[question.id]?.trim()
                    }
                    onClick={() => handleVendorComment(question.id)}
                  >
                    Send
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })()}
      </div>
    );
  }

  function renderSectionBlock(
    title: string,
    sectionQuestions: PortalQuestion[],
  ) {
    const visible = sectionQuestions.filter((question) =>
      isQuestionVisible(question.conditionalLogic, answers),
    );
    if (visible.length === 0) {
      return null;
    }
    return (
      <section key={title} className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">{title}</h2>
        {visible.map(renderQuestionCard)}
      </section>
    );
  }

  const totalQuestions = steppedSections.reduce(
    (sum, group) => sum + group.questions.length,
    0,
  );
  const answeredCount = steppedSections.reduce((sum, group) => {
    return (
      sum +
      group.questions.filter((question) => isAnswered(answers[question.id]))
        .length
    );
  }, 0);

  const currentSection =
    steppedSections[Math.min(sectionCursor, steppedSections.length - 1)];
  const currentMissingCount = currentSection
    ? findMissingRequiredQuestions(currentSection.questions, answers).length
    : 0;
  const isLastStep = sectionCursor >= steppedSections.length - 1;

  function goToNextStep() {
    if (!continueWarned && currentMissingCount > 0) {
      // Soft warning first — the vendor may intend to come back; hard
      // validation still runs at final submit.
      setContinueWarned(true);
      return;
    }
    setContinueWarned(false);
    if (isLastStep) {
      setShowReview(true);
      return;
    }
    setSectionCursor((cursor) =>
      Math.min(cursor + 1, steppedSections.length - 1),
    );
  }

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
          <ThemeToggle />
        </div>
        <p className="text-muted-foreground text-xs">
          Your answers are saved automatically — you can close this page and
          return using the same link at any time.
        </p>
        {saveStatus === "error" ? (
          <div
            className="border-destructive/50 bg-destructive/10 flex flex-wrap items-center justify-between gap-2 rounded-md border px-4 py-2"
            role="alert"
          >
            <p className="text-destructive text-xs font-medium">
              {isLinkExpired
                ? "This link has expired — your recent changes could not be saved."
                : "We couldn't save your latest changes. Check your connection and retry."}
            </p>
            {!isLinkExpired ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void performSave()}
              >
                Retry save
              </Button>
            ) : null}
          </div>
        ) : null}
        {expiryLabel ? (
          <div className="rounded-md border border-[var(--rag-amber)] bg-[var(--rag-amber)]/10 px-4 py-2">
            <p className="text-muted-foreground text-xs font-medium">
              {expiryLabel}
            </p>
          </div>
        ) : null}
      </header>

      {/* Sticky strip — a direct child of the page column so it pins for the
          entire form (a sticky element only sticks within its parent, so it
          must not live inside the short header). */}
      <div className="bg-background/95 sticky top-0 z-20 -mx-6 flex items-center gap-3 border-b px-6 py-2.5 backdrop-blur-sm">
        <ProgressBar
          className="bg-primary"
          value={
            totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0
          }
        />
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {answeredCount}/{totalQuestions}
        </span>
        {isStepped && !showReview ? (
          <span
            className="text-muted-foreground shrink-0 text-xs"
            aria-live="polite"
          >
            · Section {Math.min(sectionCursor + 1, steppedSections.length)} of{" "}
            {steppedSections.length}
          </span>
        ) : null}
        {expiresLabel ? (
          <span className="text-muted-foreground ml-auto shrink-0 text-xs">
            {expiresLabel}
          </span>
        ) : null}
        <span
          className={
            saveStatus === "error"
              ? "text-destructive shrink-0 text-xs font-medium"
              : "text-muted-foreground shrink-0 text-xs"
          }
        >
          {saveStatus === "saving"
            ? "Saving…"
            : saveStatus === "error"
              ? "Save failed"
              : saveStatus === "saved" && lastSavedAt
                ? `Saved at ${lastSavedAt}`
                : lastSavedAt
                  ? `Last saved at ${lastSavedAt}`
                  : ""}
        </span>
      </div>

      {submitError ? (
        <p className="text-destructive text-sm" role="alert">
          {submitError}
        </p>
      ) : null}

      {isStepped && !showReview && currentSection
        ? renderSectionBlock(currentSection.title, currentSection.questions)
        : null}

      {!isStepped
        ? sections.map(([sectionTitle, sectionQuestions]) =>
            renderSectionBlock(sectionTitle, sectionQuestions),
          )
        : null}

      {isStepped && !showReview ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={sectionCursor === 0}
            onClick={() => {
              setContinueWarned(false);
              setSectionCursor((cursor) => cursor - 1);
            }}
          >
            Back
          </Button>
          <div className="flex flex-col items-end gap-1">
            {continueWarned && currentMissingCount > 0 ? (
              <p
                className="text-destructive max-w-sm text-right text-xs"
                role="alert"
              >
                {currentMissingCount} required question
                {currentMissingCount !== 1 ? "s" : ""} on this section still
                need answers. You can continue and come back.
              </p>
            ) : null}
            <Button type="button" onClick={goToNextStep}>
              {isLastStep ? "Review answers" : "Continue"}
            </Button>
          </div>
        </div>
      ) : null}

      {isStepped && showReview ? (
        <section
          aria-labelledby="review-heading"
          className="flex flex-col gap-4"
        >
          <h2 id="review-heading" className="text-lg font-medium">
            Review your answers
          </h2>
          {steppedSections.map((group, index) => {
            const answered = group.questions.filter((question) =>
              isAnswered(answers[question.id]),
            ).length;
            const missing = findMissingRequiredQuestions(
              group.questions,
              answers,
            ).length;
            return (
              <div
                key={group.title}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{group.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {answered}/{group.questions.length} answered
                    {missing > 0 ? ` · ${missing} required missing` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSectionCursor(index);
                    setShowReview(false);
                    setContinueWarned(false);
                  }}
                >
                  Open section
                </Button>
              </div>
            );
          })}
        </section>
      ) : null}

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

      {/* Submit lives on the review step (multi-section) or at the end of
          single-section questionnaires — never mid-flow on an earlier page. */}
      {!isStepped || showReview ? (
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
                  You will not be able to edit your answers after submission.
                  Are you sure you are ready to submit?
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
      ) : null}
    </div>
  );
}
