"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
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
  type AssessmentFormState,
  createAssessmentAction,
} from "@/lib/actions/assessments";
import { useFormToast } from "@/hooks/use-form-toast";

type Option = { id: string; label: string };

type NewAssessmentFormProps = {
  vendorId: string;
  templates: Option[];
  reviewers: Option[];
};

const initialState: AssessmentFormState = undefined;

export function NewAssessmentForm({
  vendorId,
  templates,
  reviewers,
}: NewAssessmentFormProps) {
  const translations = useTranslations("Assessments.new.form");
  const [state, formAction, isPending] = useActionState(
    createAssessmentAction,
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="dueDate">{translations("dueDate")}</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reviewerId">{translations("reviewer")}</Label>
          <Select name="reviewerId" defaultValue="">
            <SelectTrigger id="reviewerId">
              <SelectValue placeholder={translations("unassigned")} />
            </SelectTrigger>
            <SelectContent>
              {reviewers.map((reviewer) => (
                <SelectItem key={reviewer.id} value={reviewer.id}>
                  {reviewer.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
          {isPending ? translations("creating") : translations("create")}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/vendors/${vendorId}`}>{translations("cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
