"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  EMAIL_TEMPLATE_DEFINITIONS,
  type EmailTemplateDefinition,
  type EmailTemplateType,
} from "@/lib/settings/email-templates";
import { type EmailTemplateSettings } from "@/lib/settings/schema";
import {
  type SettingsActionState,
  resetEmailTemplateAction,
  saveEmailTemplateAction,
} from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

const initialState: SettingsActionState = undefined;

const TEMPLATE_TOKENS =
  "{{vendorName}}, {{assessmentTitle}}, {{portalUrl}}, {{dueDate}}, {{reviewerName}}, {{assessmentUrl}}, {{portalPassword}}, {{message}}, {{appName}}, {{resetUrl}}, {{expiresIn}}, {{itemName}}, {{expiresDate}}, {{vendorUrl}}";

function TemplateEditorSheet({
  definition,
  subject,
  body,
  onClose,
}: {
  definition: EmailTemplateDefinition;
  subject: string;
  body: string;
  onClose: () => void;
}) {
  const [saveState, saveAction, isSaving] = useActionState(
    saveEmailTemplateAction,
    initialState,
  );
  const [resetState, resetAction, isResetting] = useActionState(
    resetEmailTemplateAction,
    initialState,
  );
  useActionFeedback(saveState);
  useActionFeedback(resetState);

  useEffect(() => {
    if (saveState?.ok || resetState?.ok) {
      onClose();
    }
  }, [saveState, resetState, onClose]);

  const resetFormId = `reset-template-${definition.type}`;

  return (
    <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
      <SheetHeader>
        <SheetTitle>{definition.label}</SheetTitle>
        <SheetDescription>{definition.description}</SheetDescription>
      </SheetHeader>

      <form action={saveAction} className="flex flex-1 flex-col gap-4 px-4">
        <input type="hidden" name="type" value={definition.type} />
        <div className="grid gap-2">
          <Label htmlFor="template-subject">Subject</Label>
          <Input
            id="template-subject"
            name="subject"
            defaultValue={subject}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="template-body">Body</Label>
          <Textarea
            id="template-body"
            name="body"
            defaultValue={body}
            rows={10}
            required
          />
        </div>
        <p className="text-muted-foreground text-xs">
          Tokens: {TEMPLATE_TOKENS}.
        </p>

        <SheetFooter className="px-0">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
          <ConfirmDialog
            title="Reset to default?"
            description={`The "${definition.label}" subject and body will be replaced with the built-in default. Any customisation will be lost.`}
            confirmLabel="Reset"
            variant="default"
            formId={resetFormId}
          >
            <Button type="button" variant="outline" disabled={isResetting}>
              {isResetting ? "Resetting..." : "Reset to default"}
            </Button>
          </ConfirmDialog>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </SheetFooter>
      </form>

      <form id={resetFormId} action={resetAction} className="hidden">
        <input type="hidden" name="type" value={definition.type} />
      </form>
    </SheetContent>
  );
}

export function TemplatesManager({
  templates,
}: {
  templates: EmailTemplateSettings;
}) {
  const [editing, setEditing] = useState<EmailTemplateType | null>(null);
  const activeDefinition = editing
    ? EMAIL_TEMPLATE_DEFINITIONS.find(
        (definition) => definition.type === editing,
      )
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col divide-y rounded-lg border">
        {EMAIL_TEMPLATE_DEFINITIONS.map((definition) => (
          <button
            key={definition.type}
            type="button"
            onClick={() => setEditing(definition.type)}
            className="hover:bg-muted/50 flex flex-col items-start gap-1 p-3 text-left"
          >
            <span className="text-sm font-medium">{definition.label}</span>
            <span className="text-muted-foreground text-xs">
              {definition.description}
            </span>
            <span className="text-muted-foreground w-full truncate text-xs italic">
              {templates[definition.subjectField]}
            </span>
          </button>
        ))}
      </div>

      <Sheet
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        {activeDefinition ? (
          <TemplateEditorSheet
            key={activeDefinition.type}
            definition={activeDefinition}
            subject={templates[activeDefinition.subjectField]}
            body={templates[activeDefinition.bodyField]}
            onClose={() => setEditing(null)}
          />
        ) : null}
      </Sheet>
    </div>
  );
}
