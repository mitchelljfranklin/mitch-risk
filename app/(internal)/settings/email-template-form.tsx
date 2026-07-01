"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { type SettingsActionState, saveEmailTemplateSettings } from "./actions";
import { useFormToast } from "@/hooks/use-form-toast";

type EmailTemplateFormProps = {
  inviteSubject: string;
  inviteBody: string;
  invitePasswordSubject: string;
  invitePasswordBody: string;
  reminderSubject: string;
  reminderBody: string;
  escalationSubject: string;
  escalationBody: string;
  submissionSubject: string;
  submissionBody: string;
};

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
        <Textarea
          id={bodyName}
          name={bodyName}
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
  invitePasswordSubject,
  invitePasswordBody,
  reminderSubject,
  reminderBody,
  escalationSubject,
  escalationBody,
  submissionSubject,
  submissionBody,
}: EmailTemplateFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveEmailTemplateSettings,
    initialState,
  );
  useFormToast(state);

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
        label="Invite email (password protected)"
        subjectName="invitePasswordSubject"
        subjectDefault={invitePasswordSubject}
        bodyName="invitePasswordBody"
        bodyDefault={invitePasswordBody}
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
      <TemplateSection
        label="Submission received email"
        subjectName="submissionSubject"
        subjectDefault={submissionSubject}
        bodyName="submissionBody"
        bodyDefault={submissionBody}
      />
      <p className="text-muted-foreground text-xs">
        Tokens: {"{{"}vendorName{"}}"}, {"{{"}assessmentTitle{"}}"}, {"{{"}
        portalUrl{"}}"}, {"{{"}dueDate{"}}"}, {"{{"}reviewerName{"}}"}, {"{{"}
        assessmentUrl{"}}"}, {"{{"}portalPassword{"}}"}.
      </p>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Saving..." : "Save templates"}
        </Button>
      </div>
    </form>
  );
}
