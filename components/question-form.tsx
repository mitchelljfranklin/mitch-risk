"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useActionState } from "react";
import { useTranslations } from "next-intl";
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
  QUESTION_TYPES,
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
  const translations = useTranslations("Templates.question");
  const questionTypes = useTranslations("Common.questionTypes");
  const riskWeights = useTranslations("Common.tiers");
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

  // Switching answer type clears the scoring key (different semantics per
  // type), but stashes the previous selections so toggling back restores them
  // instead of silently losing the author's work.
  const selectionSnapshot = useRef<{
    accepted?: string[];
    selections?: string[];
  }>({});

  const isDirty =
    liveHelpText !== (defaults?.helpText ?? "") ||
    optionsText !== (defaults?.options.join("\n") ?? "");

  useEffect(() => {
    if (!isDirty) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

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
        <Label htmlFor="text">{translations("text")}</Label>
        <Input id="text" name="text" defaultValue={defaults?.text} required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="helpText">{translations("help")}</Label>
        <input type="hidden" name="helpText" value={liveHelpText} />
        <p className="text-muted-foreground text-xs">
          {translations("helpHint")}
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
          <Label htmlFor="type">{translations("answerType")}</Label>
          <Select
            name="type"
            value={type}
            onValueChange={(value) => {
              const nextType = value as QuestionType;
              // Stash the outgoing key, restore any stashed key for the
              // incoming type.
              selectionSnapshot.current = {
                accepted: acceptedAnswers,
                selections: expectedSelections,
              };
              if (nextType === "MULTI_SELECT") {
                setExpectedSelections(
                  selectionSnapshot.current.selections ?? [],
                );
                setAcceptedAnswers([]);
              } else if (
                nextType === "MULTIPLE_CHOICE" ||
                nextType === "COMBOBOX"
              ) {
                setAcceptedAnswers(selectionSnapshot.current.accepted ?? []);
                setExpectedSelections([]);
              } else {
                setAcceptedAnswers([]);
                setExpectedSelections([]);
              }
              setType(nextType);
            }}
          >
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUESTION_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {questionTypes.has(value) ? questionTypes(value) : value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="riskWeight">{translations("riskWeight")}</Label>
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
                  {riskWeights.has(value) ? riskWeights(value) : value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="required" defaultChecked={defaults?.required ?? true} />
        {translations("required")}
      </label>

      {type === "MULTIPLE_CHOICE" ||
      type === "COMBOBOX" ||
      type === "MULTI_SELECT" ? (
        <div className="grid gap-2">
          <Label htmlFor="options">{translations("options")}</Label>
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
          <Label htmlFor="expectedAnswer">
            {translations("expectedAnswer")}
          </Label>
          <Select
            name="expectedAnswer"
            defaultValue={
              typeof defaults?.expectedAnswer === "string"
                ? defaults.expectedAnswer
                : ""
            }
          >
            <SelectTrigger id="expectedAnswer">
              <SelectValue placeholder={translations("noExpectedAnswer")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">
                {translations("noExpectedAnswer")}
              </SelectItem>
              <SelectItem value="YES">{translations("yes")}</SelectItem>
              <SelectItem value="NO">{translations("no")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {type === "MULTIPLE_CHOICE" || type === "COMBOBOX" ? (
        <div className="grid gap-2">
          <Label>{translations("acceptedAnswers")}</Label>
          <p className="text-muted-foreground text-xs">
            {translations("acceptedHint")}
          </p>
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
            emptyMessage={translations("acceptedEmpty")}
          />
        </div>
      ) : null}

      {type === "NUMERIC" || type === "RATING" ? (
        <div className="grid gap-2">
          <Label htmlFor="expectedAnswer">
            {translations("expectedAnswer")}
          </Label>
          <Input
            id="expectedAnswer"
            name="expectedAnswer"
            type="number"
            placeholder={translations("expectedNumber")}
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
          <Label>{translations("expectedSelections")}</Label>
          <p className="text-muted-foreground text-xs">
            {translations("selectionsHint")}
          </p>
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
            emptyMessage={translations("selectionsEmpty")}
          />
        </div>
      ) : null}

      {type === "FREE_TEXT" ||
      type === "FILE_UPLOAD" ||
      type === "DATE" ||
      type === "URL" ||
      type === "EMAIL" ? (
        <p className="text-muted-foreground text-sm">
          {translations("manualScoring")}
        </p>
      ) : null}

      {type === "CHECKBOX" ? (
        <div className="grid gap-2">
          <Label htmlFor="expectedAnswer">
            {translations("expectedAnswer")}
          </Label>
          <Select
            name="expectedAnswer"
            defaultValue={
              defaults?.expectedAnswer === "false" ? "false" : "true"
            }
          >
            <SelectTrigger id="expectedAnswer">
              <SelectValue placeholder={translations("checked")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">{translations("checked")}</SelectItem>
              <SelectItem value="false">{translations("unchecked")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <fieldset>
        <legend className="sr-only">{translations("conditionalLegend")}</legend>
        <ConditionalRulesEditor
          questions={otherQuestions}
          defaultMatch={defaults?.conditionMatch ?? "all"}
          defaultRules={defaults?.conditionRules ?? []}
        />
      </fieldset>

      <fieldset>
        <legend className="sr-only">{translations("controlsLegend")}</legend>
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
          {isPending ? translations("saving") : translations("save")}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/templates/${templateId}`}>
            {translations("cancel")}
          </Link>
        </Button>
      </div>
    </form>
  );
}
