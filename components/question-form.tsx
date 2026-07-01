"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { ControlMultiSelect } from "@/components/control-multi-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type FormState, saveQuestionAction } from "@/lib/actions/templates";
import {
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
  RISK_WEIGHT_LABELS,
  RISK_WEIGHTS,
} from "@/lib/schemas/template";
import { useFormToast } from "@/hooks/use-form-toast";

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
  useFormToast(state);
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
          <Select
            name="type"
            value={type}
            onValueChange={(value) => setType(value as QuestionType)}
          >
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUESTION_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {QUESTION_TYPE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="riskWeight">Risk weight</Label>
          <Select
            name="riskWeight"
            defaultValue={defaults?.riskWeight ?? "MEDIUM"}
          >
            <SelectTrigger id="riskWeight">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RISK_WEIGHTS.map((value) => (
                <SelectItem key={value} value={value}>
                  {RISK_WEIGHT_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="required" defaultChecked={defaults?.required ?? true} />
        Required
      </label>

      {type === "MULTIPLE_CHOICE" ||
      type === "COMBOBOX" ||
      type === "MULTI_SELECT" ? (
        <div className="grid gap-2">
          <Label htmlFor="options">Options (one per line)</Label>
          <Textarea
            id="options"
            name="options"
            defaultValue={defaults?.options.join("\n")}
            rows={4}
          />
        </div>
      ) : null}

      {type === "YES_NO" ? (
        <div className="grid gap-2">
          <Label htmlFor="expectedAnswer">Expected answer</Label>
          <Select
            name="expectedAnswer"
            defaultValue={defaults?.expectedAnswer ?? ""}
          >
            <SelectTrigger id="expectedAnswer">
              <SelectValue placeholder="No expected answer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No expected answer</SelectItem>
              <SelectItem value="YES">Yes</SelectItem>
              <SelectItem value="NO">No</SelectItem>
            </SelectContent>
          </Select>
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
          <Textarea
            id="expectedAnswer"
            name="expectedAnswer"
            rows={4}
            defaultValue={
              Array.isArray(defaults?.expectedAnswer)
                ? defaults.expectedAnswer.join("\n")
                : ""
            }
          />
        </div>
      ) : null}

      {type === "FREE_TEXT" ||
      type === "FILE_UPLOAD" ||
      type === "DATE" ||
      type === "URL" ||
      type === "EMAIL" ? (
        <p className="text-muted-foreground text-sm">
          This answer type is scored manually during review.
        </p>
      ) : null}

      {type === "CHECKBOX" ? (
        <div className="grid gap-2">
          <Label htmlFor="expectedAnswer">Expected answer</Label>
          <Select
            name="expectedAnswer"
            defaultValue={defaults?.expectedAnswer ? "true" : "false"}
          >
            <SelectTrigger id="expectedAnswer">
              <SelectValue placeholder="Should be checked?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Checked</SelectItem>
              <SelectItem value="false">Unchecked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="conditionQuestionId">Show only if (optional)</Label>
          <Select
            name="conditionQuestionId"
            defaultValue={defaults?.conditionQuestionId ?? ""}
          >
            <SelectTrigger id="conditionQuestionId">
              <SelectValue placeholder="Always show" />
            </SelectTrigger>
            <SelectContent>
              {otherQuestions.map((question) => (
                <SelectItem key={question.id} value={question.id}>
                  {question.text.slice(0, 60)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          {isPending ? "Saving..." : "Save question"}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/templates/${templateId}`}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
