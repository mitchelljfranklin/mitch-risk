"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { updateAssessmentAction } from "@/lib/actions/assessments";

type DraftEditorProps = {
  assessmentId: string;
  title: string;
  dueDate: string;
};

export function DraftEditor({
  assessmentId,
  title,
  dueDate,
}: DraftEditorProps) {
  const translations = useTranslations("Assessments.detail.draft");
  const [state, action, isPending] = useActionState(
    updateAssessmentAction,
    undefined,
  );
  useActionFeedback(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{translations("settingsTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4">
          <input type="hidden" name="assessmentId" value={assessmentId} />
          <div className="grid gap-2">
            <Label htmlFor="draftTitle">{translations("title")}</Label>
            <Input id="draftTitle" name="title" defaultValue={title} required />
          </div>
          <div className="flex items-end gap-3">
            <div className="grid gap-2">
              <Label htmlFor="draftDueDate">{translations("dueDate")}</Label>
              <Input
                id="draftDueDate"
                name="dueDate"
                type="date"
                defaultValue={dueDate}
              />
            </div>
            <Button type="submit" variant="secondary" disabled={isPending}>
              {isPending ? translations("saving") : translations("save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
