"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONDITION_OPERATORS,
  VALUELESS_OPERATORS,
  type ConditionOperator,
} from "@/lib/portal";

type Rule = { questionId: string; operator: ConditionOperator; value: string };

type ControllingQuestion = {
  id: string;
  text: string;
  type?: string;
  options?: string[] | null;
};

type ValueChoice = { value: string; label: string };

type ConditionalEditorTranslate = (key: string) => string;

// For choice-type controlling questions the answer tokens are fixed by the
// portal (YES/NO, the declared options, …), so offer them instead of letting
// authors type a value that can never match.
function valueChoicesFor(
  question: ControllingQuestion | undefined,
  operator: ConditionOperator,
  translations: ConditionalEditorTranslate,
): ValueChoice[] | null {
  if (!question?.type) return null;
  if (operator !== "equals" && operator !== "notEquals") return null;
  switch (question.type) {
    case "YES_NO":
      return [
        { value: "YES", label: translations("yes") },
        { value: "NO", label: translations("no") },
      ];
    case "CHECKBOX":
      return [
        { value: "true", label: translations("checked") },
        { value: "false", label: translations("unchecked") },
      ];
    case "MULTIPLE_CHOICE":
    case "COMBOBOX":
      return (question.options ?? []).map((option) => ({
        value: option,
        label: option,
      }));
    default:
      return null;
  }
}

type ConditionalRulesEditorProps = {
  questions: ControllingQuestion[];
  defaultMatch: "all" | "any";
  defaultRules: Rule[];
};

export function ConditionalRulesEditor({
  questions,
  defaultMatch,
  defaultRules,
}: ConditionalRulesEditorProps) {
  const translations = useTranslations("Templates.conditions.editing");
  const operators = useTranslations("Templates.conditions.operators");
  const [match, setMatch] = useState<"all" | "any">(defaultMatch);
  const [rules, setRules] = useState<Rule[]>(defaultRules);

  const serialized = JSON.stringify({
    match,
    rules: rules.filter((rule) => rule.questionId.length > 0),
  });

  function updateRule(index: number, patch: Partial<Rule>) {
    setRules((prev) =>
      prev.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    );
  }

  function addRule() {
    setRules((prev) => [
      ...prev,
      { questionId: "", operator: "equals", value: "" },
    ]);
  }

  function removeRule(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="grid gap-3 rounded-md border p-3">
      <input type="hidden" name="conditionalLogic" value={serialized} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{translations("title")}</p>
        {rules.length > 1 ? (
          <label className="flex items-center gap-2 text-xs">
            {translations("match")}
            <Select
              value={match}
              onValueChange={(value) => setMatch(value as "all" | "any")}
            >
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{translations("all")}</SelectItem>
                <SelectItem value="any">{translations("any")}</SelectItem>
              </SelectContent>
            </Select>
          </label>
        ) : null}
      </div>

      {questions.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          {translations("noQuestions")}
        </p>
      ) : rules.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          {translations("alwaysShown")}
        </p>
      ) : (
        <div className="grid gap-2">
          {rules.map((rule, index) => {
            const needsValue = !VALUELESS_OPERATORS.includes(rule.operator);
            const controllingQuestion = questions.find(
              (question) => question.id === rule.questionId,
            );
            const valueChoices =
              needsValue && controllingQuestion
                ? valueChoicesFor(
                    controllingQuestion,
                    rule.operator,
                    translations,
                  )
                : null;
            return (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <Select
                  value={rule.questionId}
                  onValueChange={(value) =>
                    updateRule(index, { questionId: value, value: "" })
                  }
                >
                  <SelectTrigger className="h-8 w-full text-xs sm:w-56">
                    <SelectValue placeholder={translations("selectQuestion")} />
                  </SelectTrigger>
                  <SelectContent>
                    {questions.map((question) => (
                      <SelectItem key={question.id} value={question.id}>
                        {question.text.slice(0, 60)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={rule.operator}
                  onValueChange={(value) =>
                    updateRule(index, { operator: value as ConditionOperator })
                  }
                >
                  <SelectTrigger className="h-8 w-full text-xs sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPERATORS.map((operator) => (
                      <SelectItem key={operator} value={operator}>
                        {operators(operator)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {needsValue ? (
                  valueChoices ? (
                    <Select
                      value={rule.value}
                      onValueChange={(value) => updateRule(index, { value })}
                    >
                      <SelectTrigger className="h-8 w-full text-xs sm:w-36">
                        <SelectValue placeholder={translations("value")} />
                      </SelectTrigger>
                      <SelectContent>
                        {valueChoices.map((choice) => (
                          <SelectItem key={choice.value} value={choice.value}>
                            {choice.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={rule.value}
                      onChange={(event) =>
                        updateRule(index, { value: event.target.value })
                      }
                      placeholder={translations("value")}
                      className="h-8 w-full text-xs sm:w-32"
                    />
                  )
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeRule(index)}
                >
                  {translations("remove")}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {questions.length > 0 ? (
        <div>
          <Button type="button" size="sm" variant="outline" onClick={addRule}>
            {translations("addRule")}
          </Button>
        </div>
      ) : null}
      <Label className="sr-only">{translations("legend")}</Label>
    </div>
  );
}
