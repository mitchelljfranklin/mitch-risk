"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

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
  const translations = useTranslations("SelfAssessment.new.form");
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
        <Label htmlFor="title">{translations("title")}</Label>
        <Input
          id="title"
          name="title"
          placeholder={translations("titlePlaceholder")}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="templateId">{translations("template")}</Label>
        <Combobox
          name="templateId"
          options={templates}
          placeholder={translations("templatePlaceholder")}
          emptyText={translations("noTemplates")}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="dueDate">{translations("dueDate")}</Label>
        <Input id="dueDate" name="dueDate" type="date" />
      </div>
      {templates.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {translations("publishFirst")}
        </p>
      ) : null}
      {state?.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || templates.length === 0}>
          {isPending ? translations("starting") : translations("start")}
        </Button>
      </div>
    </form>
  );
}
