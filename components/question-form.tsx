"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import MDEditor, { commands } from "@uiw/react-md-editor";

import { ConditionalRulesEditor } from "@/components/conditional-rules-editor";
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
  type QuestionType,
} from "@/lib/schemas/template";
import { type ConditionOperator } from "@/lib/portal";
import { useFormToast } from "@/hooks/use-form-toast";

type RiskWeight = (typeof RISK_WEIGHTS)[number];

type ConditionRule = {
  questionId: string;
  operator: ConditionOperator;
  value: string;
};

type QuestionDefaults = {
  text: string;
  helpText: string;
  type: QuestionType;
  riskWeight: RiskWeight;
  required: boolean;
  options: string[];
  expectedAnswer: string | number | string[];
  conditionMatch: "all" | "any";
  conditionRules: ConditionRule[];
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
  otherQuestions: {
    id: string;
    text: string;
    type?: string;
    options?: string[];
  }[];
  defaults?: QuestionDefaults;
};

const initialState: FormState = undefined;

function toggleListEntry(list: string[], option: string): string[] {
  return list.includes(option)
    ? list.filter((entry) => entry !== option)
    : [...list, option];
}

type OptionChecklistProps = {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  emptyMessage: string;
};

function OptionChecklist({
  options,
  selected,
  onToggle,
  emptyMessage,
}: OptionChecklistProps) {
  if (options.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;
  }
  return (
    <div className="grid gap-2 rounded-md border p-3">
      {options.map((option) => (
        <label key={option} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={selected.includes(option)}
            onCheckedChange={() => onToggle(option)}
          />
          {option}
        </label>
      ))}
    </div>
  );
}

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
  const [liveHelpText, setLiveHelpText] = useState(defaults?.helpText ?? "");
  const [optionsText, setOptionsText] = useState(
    defaults?.options.join("\n") ?? "",
  );
  const [acceptedAnswers, setAcceptedAnswers] = useState<string[]>(() => {
    const expected = defaults?.expectedAnswer;
    if (Array.isArray(expected)) return expected;
    if (typeof expected === "string" && expected.length > 0) return [expected];
    return [];
  });
  const [expectedSelections, setExpectedSelections] = useState<string[]>(() => {
    const expected = defaults?.expectedAnswer;
    return Array.isArray(expected) ? expected : [];
  });

  const parsedOptions = optionsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

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
        <input type="hidden" name="helpText" value={liveHelpText} />
        <p className="text-muted-foreground text-xs">
          Markdown formatting is supported — use **bold**, *italic*, lists, and
          links.
        </p>
        <MDEditor
          value={liveHelpText}
          onChange={(value) => setLiveHelpText(value ?? "")}
          preview="edit"
          height={200}
          visibleDragbar={false}
          extraCommands={[commands.codeEdit, commands.codePreview]}
          commandsFilter={(cmd) => {
            const name = cmd.name ?? "";
            if (name === "image") return { ...cmd, disabled: true };
            if (
              ["fullscreen", "code", "code-block", "comment"].includes(name)
            ) {
              return false;
            }
            return cmd;
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="type">Answer type</Label>
          <Select
            name="type"
            value={type}
            onValueChange={(value) => {
              setType(value as QuestionType);
              setAcceptedAnswers([]);
              setExpectedSelections([]);
            }}
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
            value={optionsText}
            onChange={(event) => setOptionsText(event.target.value)}
            rows={4}
          />
        </div>
      ) : null}

      {type === "YES_NO" ? (
        <div className="grid gap-2">
          <Label htmlFor="expectedAnswer">Expected answer</Label>
          <Select
            name="expectedAnswer"
            defaultValue={
              typeof defaults?.expectedAnswer === "string"
                ? defaults.expectedAnswer
                : ""
            }
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

      {type === "MULTIPLE_CHOICE" || type === "COMBOBOX" ? (
        <div className="grid gap-2">
          <Label>Accepted answers</Label>
          <input
            type="hidden"
            name="expectedAnswer"
            value={acceptedAnswers.join("\n")}
          />
          <OptionChecklist
            options={parsedOptions}
            selected={acceptedAnswers}
            onToggle={(option) =>
              setAcceptedAnswers((current) => toggleListEntry(current, option))
            }
            emptyMessage="Add options above to choose which answers are acceptable."
          />
        </div>
      ) : null}

      {type === "NUMERIC" || type === "RATING" ? (
        <div className="grid gap-2">
          <Label htmlFor="expectedAnswer">Expected answer</Label>
          <Input
            id="expectedAnswer"
            name="expectedAnswer"
            type="number"
            placeholder="Expected number"
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
          <Label>Expected selections</Label>
          <input
            type="hidden"
            name="expectedAnswer"
            value={expectedSelections.join("\n")}
          />
          <OptionChecklist
            options={parsedOptions}
            selected={expectedSelections}
            onToggle={(option) =>
              setExpectedSelections((current) =>
                toggleListEntry(current, option),
              )
            }
            emptyMessage="Add options above to choose the required selections."
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
            defaultValue={
              defaults?.expectedAnswer === "false" ? "false" : "true"
            }
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

      <fieldset>
        <legend className="sr-only">Conditional visibility rules</legend>
        <ConditionalRulesEditor
          questions={otherQuestions}
          defaultMatch={defaults?.conditionMatch ?? "all"}
          defaultRules={defaults?.conditionRules ?? []}
        />
      </fieldset>

      <fieldset>
        <legend className="sr-only">Mapped compliance controls</legend>
        <ControlMultiSelect
          controls={controls}
          selectedIds={selectedControlIds}
        />
      </fieldset>

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
