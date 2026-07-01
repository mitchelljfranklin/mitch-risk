"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { type SettingsActionState, saveEmailTemplateSettings } from "./actions";

type EmailTemplateFormProps = {
  inviteSubject: string;
  inviteBody: string;
  reminderSubject: string;
  reminderBody: string;
  escalationSubject: string;
  escalationBody: string;
};

const TEXTAREA_CLASS =
  "border-input bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm";

const initialState: SettingsActionState = undefined;

function TemplateSection({
  label,
  subjectName,
  subjectDefault,
  bodyName,
  bodyDefault,
}: {
  label: string;
  subjectName: string;
  subjectDefault: string;
  bodyName: string;
  bodyDefault: string;
}) {
  return (
    <div className="grid gap-3 rounded-md border p-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid gap-2">
        <Label htmlFor={subjectName}>Subject</Label>
        <Input
          id={subjectName}
          name={subjectName}
          defaultValue={subjectDefault}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={bodyName}>Body</Label>
        <textarea
          id={bodyName}
          name={bodyName}
          className={TEXTAREA_CLASS}
          defaultValue={bodyDefault}
          rows={4}
        />
      </div>
    </div>
  );
}

export function EmailTemplateForm({
  inviteSubject,
  inviteBody,
  reminderSubject,
  reminderBody,
  escalationSubject,
  escalationBody,
}: EmailTemplateFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveEmailTemplateSettings,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <TemplateSection
        label="Invite email"
        subjectName="inviteSubject"
        subjectDefault={inviteSubject}
        bodyName="inviteBody"
        bodyDefault={inviteBody}
      />
      <TemplateSection
        label="Reminder email"
        subjectName="reminderSubject"
        subjectDefault={reminderSubject}
        bodyName="reminderBody"
        bodyDefault={reminderBody}
      />
      <TemplateSection
        label="Escalation email"
        subjectName="escalationSubject"
        subjectDefault={escalationSubject}
        bodyName="escalationBody"
        bodyDefault={escalationBody}
      />
      <p className="text-muted-foreground text-xs">
        Tokens: {"{{"}vendorName{"}}"}, {"{{"}assessmentTitle{"}}"}, {"{{"}
        portalUrl{"}}"}, {"{{"}dueDate{"}}"}, {"{{"}reviewerName{"}}"}, {"{{"}
        assessmentUrl{"}}"}.
      </p>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save templates"}
        </Button>
        {state ? (
          <span
            className={
              state.ok
                ? "text-muted-foreground text-sm"
                : "text-destructive text-sm"
            }
            role="status"
          >
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
