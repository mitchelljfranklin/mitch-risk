"use client";

import { useState } from "react";

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
  CONDITION_OPERATOR_LABELS,
  VALUELESS_OPERATORS,
  type ConditionOperator,
} from "@/lib/portal";

type Rule = { questionId: string; operator: ConditionOperator; value: string };

type ConditionalRulesEditorProps = {
  questions: { id: string; text: string }[];
  defaultMatch: "all" | "any";
  defaultRules: Rule[];
};

export function ConditionalRulesEditor({
  questions,
  defaultMatch,
  defaultRules,
}: ConditionalRulesEditorProps) {
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
        <p className="text-sm font-medium">Conditional visibility</p>
        {rules.length > 1 ? (
          <label className="flex items-center gap-2 text-xs">
            Match
            <Select
              value={match}
              onValueChange={(value) => setMatch(value as "all" | "any")}
            >
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All (AND)</SelectItem>
                <SelectItem value="any">Any (OR)</SelectItem>
              </SelectContent>
            </Select>
          </label>
        ) : null}
      </div>

      {questions.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          Add other questions first to make this one conditional.
        </p>
      ) : rules.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          Always shown. Add a rule to show this question only when other answers
          match.
        </p>
      ) : (
        <div className="grid gap-2">
          {rules.map((rule, index) => {
            const needsValue = !VALUELESS_OPERATORS.includes(rule.operator);
            return (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <Select
                  value={rule.questionId}
                  onValueChange={(value) =>
                    updateRule(index, { questionId: value })
                  }
                >
                  <SelectTrigger className="h-8 w-56 text-xs">
                    <SelectValue placeholder="Select a question" />
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
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPERATORS.map((operator) => (
                      <SelectItem key={operator} value={operator}>
                        {CONDITION_OPERATOR_LABELS[operator]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {needsValue ? (
                  <Input
                    value={rule.value}
                    onChange={(event) =>
                      updateRule(index, { value: event.target.value })
                    }
                    placeholder="Value"
                    className="h-8 w-32 text-xs"
                  />
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeRule(index)}
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {questions.length > 0 ? (
        <div>
          <Button type="button" size="sm" variant="outline" onClick={addRule}>
            Add rule
          </Button>
        </div>
      ) : null}
      <Label className="sr-only">Conditional logic</Label>
    </div>
  );
}
