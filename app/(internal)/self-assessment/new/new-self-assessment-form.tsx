"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type AssessmentFormState,
  createAndStartSelfAssessmentAction,
} from "@/lib/actions/assessments";
import { useFormToast } from "@/hooks/use-form-toast";

type Option = { id: string; label: string };

type NewSelfAssessmentFormProps = {
  vendorId: string;
  templates: Option[];
};

const initialState: AssessmentFormState = undefined;

export function NewSelfAssessmentForm({
  vendorId,
  templates,
}: NewSelfAssessmentFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_prev: AssessmentFormState, formData: FormData) => {
      const result = await createAndStartSelfAssessmentAction(formData);
      if (result?.ok && result?.portalUrl) {
        router.push(result.portalUrl);
      }
      return result;
    },
    initialState,
  );
  useFormToast(state);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="vendorId" value={vendorId} />
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          placeholder="e.g. ISO 27001:2022 self-assessment"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="templateId">Questionnaire template</Label>
        <Combobox
          name="templateId"
          options={templates}
          placeholder="Select a published template"
          emptyText="No templates found."
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="dueDate">Due date (optional)</Label>
        <Input id="dueDate" name="dueDate" type="date" />
      </div>
      {templates.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Publish a template first to start a self-assessment.
        </p>
      ) : null}
      {state?.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || templates.length === 0}>
          {isPending ? "Starting..." : "Start assessment"}
        </Button>
      </div>
    </form>
  );
}
