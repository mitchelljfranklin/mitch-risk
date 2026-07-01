"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type AssessmentFormState,
  createAssessmentAction,
} from "@/lib/actions/assessments";

type Option = { id: string; label: string };

type NewAssessmentFormProps = {
  vendorId: string;
  templates: Option[];
  reviewers: Option[];
};

const SELECT_CLASS =
  "border-input bg-background h-9 rounded-md border px-3 text-sm";

const initialState: AssessmentFormState = undefined;

export function NewAssessmentForm({
  vendorId,
  templates,
  reviewers,
}: NewAssessmentFormProps) {
  const [state, formAction, isPending] = useActionState(
    createAssessmentAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="vendorId" value={vendorId} />
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          placeholder="e.g. Annual security review"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="templateId">Questionnaire template</Label>
        <select
          id="templateId"
          name="templateId"
          className={SELECT_CLASS}
          defaultValue=""
          required
        >
          <option value="" disabled>
            Select a published template
          </option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reviewerId">Reviewer</Label>
          <select
            id="reviewerId"
            name="reviewerId"
            className={SELECT_CLASS}
            defaultValue=""
          >
            <option value="">Unassigned</option>
            {reviewers.map((reviewer) => (
              <option key={reviewer.id} value={reviewer.id}>
                {reviewer.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {templates.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Publish a template first to create an assessment.
        </p>
      ) : null}
      {state?.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || templates.length === 0}>
          {isPending ? "Creating…" : "Create assessment"}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/vendors/${vendorId}`}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
