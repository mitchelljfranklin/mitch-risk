"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { ControlMultiSelect } from "@/components/control-multi-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type FormState, saveQuestionAction } from "@/lib/actions/templates";
import {
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
  RISK_WEIGHT_LABELS,
  RISK_WEIGHTS,
} from "@/lib/schemas/template";

type QuestionType = (typeof QUESTION_TYPES)[number];
type RiskWeight = (typeof RISK_WEIGHTS)[number];

type QuestionDefaults = {
  text: string;
  helpText: string;
  type: QuestionType;
  riskWeight: RiskWeight;
  required: boolean;
  options: string[];
  expectedAnswer: string;
  conditionQuestionId: string;
  conditionEquals: string;
};

type QuestionFormProps = {
  templateId: string;
  sectionId: string;
  questionId?: string;
  controls: {
    id: string;
    code: string;
    title: string;
    frameworkName: string;
  }[];
  selectedControlIds: string[];
  otherQuestions: { id: string; text: string }[];
  defaults?: QuestionDefaults;
};

const CONTROL_CLASS =
  "border-input bg-background h-9 rounded-md border px-3 text-sm";
const TEXTAREA_CLASS =
  "border-input bg-background min-h-24 rounded-md border px-3 py-2 text-sm";

const initialState: FormState = undefined;

export function QuestionForm({
  templateId,
  sectionId,
  questionId,
  controls,
  selectedControlIds,
  otherQuestions,
  defaults,
}: QuestionFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveQuestionAction,
    initialState,
  );
  const [type, setType] = useState<QuestionType>(defaults?.type ?? "YES_NO");

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="templateId" value={templateId} />
      <input type="hidden" name="sectionId" value={sectionId} />
      {questionId ? (
        <input type="hidden" name="questionId" value={questionId} />
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="text">Question text</Label>
        <Input id="text" name="text" defaultValue={defaults?.text} required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="helpText">Help text</Label>
        <Input
          id="helpText"
          name="helpText"
          defaultValue={defaults?.helpText}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="type">Answer type</Label>
          <select
            id="type"
            name="type"
            className={CONTROL_CLASS}
            value={type}
            onChange={(event) => setType(event.target.value as QuestionType)}
          >
            {QUESTION_TYPES.map((value) => (
              <option key={value} value={value}>
                {QUESTION_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="riskWeight">Risk weight</Label>
          <select
            id="riskWeight"
            name="riskWeight"
            className={CONTROL_CLASS}
            defaultValue={defaults?.riskWeight ?? "MEDIUM"}
          >
            {RISK_WEIGHTS.map((value) => (
              <option key={value} value={value}>
                {RISK_WEIGHT_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="required"
          defaultChecked={defaults?.required ?? true}
          className="size-4"
        />
        Required
      </label>

      {type === "MULTIPLE_CHOICE" ||
      type === "COMBOBOX" ||
      type === "MULTI_SELECT" ? (
        <div className="grid gap-2">
          <Label htmlFor="options">Options (one per line)</Label>
          <textarea
            id="options"
            name="options"
            className={TEXTAREA_CLASS}
            defaultValue={defaults?.options.join("\n")}
          />
        </div>
      ) : null}

      {type === "YES_NO" ? (
        <div className="grid gap-2">
          <Label htmlFor="expectedAnswer">Expected answer</Label>
          <select
            id="expectedAnswer"
            name="expectedAnswer"
            className={CONTROL_CLASS}
            defaultValue={defaults?.expectedAnswer ?? ""}
          >
            <option value="">No expected answer</option>
            <option value="YES">Yes</option>
            <option value="NO">No</option>
          </select>
        </div>
      ) : null}

      {type === "MULTIPLE_CHOICE" ||
      type === "COMBOBOX" ||
      type === "NUMERIC" ||
      type === "RATING" ? (
        <div className="grid gap-2">
          <Label htmlFor="expectedAnswer">Expected answer</Label>
          <Input
            id="expectedAnswer"
            name="expectedAnswer"
            type={type === "NUMERIC" || type === "RATING" ? "number" : "text"}
            placeholder={
              type === "NUMERIC" || type === "RATING"
                ? "Expected number"
                : "Exact option text"
            }
            defaultValue={
              typeof defaults?.expectedAnswer === "string" ||
              typeof defaults?.expectedAnswer === "number"
                ? String(defaults.expectedAnswer)
                : ""
            }
          />
        </div>
      ) : null}

      {type === "MULTI_SELECT" ? (
        <div className="grid gap-2">
          <Label htmlFor="expectedAnswer">
            Expected selections (one per line)
          </Label>
          <textarea
            id="expectedAnswer"
            name="expectedAnswer"
            className={TEXTAREA_CLASS}
            defaultValue={
              Array.isArray(defaults?.expectedAnswer)
                ? defaults.expectedAnswer.join("\n")
                : ""
            }
          />
        </div>
      ) : null}

      {type === "FREE_TEXT" || type === "FILE_UPLOAD" || type === "DATE" ? (
        <p className="text-muted-foreground text-sm">
          This answer type is scored manually during review.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="conditionQuestionId">Show only if (optional)</Label>
          <select
            id="conditionQuestionId"
            name="conditionQuestionId"
            className={CONTROL_CLASS}
            defaultValue={defaults?.conditionQuestionId ?? ""}
          >
            <option value="">Always show</option>
            {otherQuestions.map((question) => (
              <option key={question.id} value={question.id}>
                {question.text.slice(0, 60)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="conditionEquals">…answer equals</Label>
          <Input
            id="conditionEquals"
            name="conditionEquals"
            defaultValue={defaults?.conditionEquals}
            placeholder="e.g. YES"
          />
        </div>
      </div>

      <ControlMultiSelect
        controls={controls}
        selectedIds={selectedControlIds}
      />

      {state?.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save question"}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/templates/${templateId}`}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
