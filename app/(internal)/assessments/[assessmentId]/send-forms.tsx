"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  generateLinkAction,
  sendAssessmentAction,
  sendToCustomEmailAction,
} from "@/lib/actions/assessments";

type SendFormsProps = {
  assessmentId: string;
};

export function SendForms({ assessmentId }: SendFormsProps) {
  const translations = useTranslations("Assessments.detail.sender");
  const [password, setPassword] = useState("");

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="portalPassword">{translations("password")}</Label>
        <Input
          id="portalPassword"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={translations("passwordPlaceholder")}
          className="w-full max-w-72"
        />
        <p className="text-muted-foreground text-xs">
          {translations("passwordHint")}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <form action={sendAssessmentAction} className="flex items-center gap-2">
          <input type="hidden" name="assessmentId" value={assessmentId} />
          <input type="hidden" name="portalPassword" value={password} />
          <SubmitButton type="submit" size="sm">
            {translations("sendToVendor")}
          </SubmitButton>
        </form>

        <form action={generateLinkAction} className="flex items-center gap-2">
          <input type="hidden" name="assessmentId" value={assessmentId} />
          <input type="hidden" name="portalPassword" value={password} />
          <SubmitButton type="submit" variant="outline" size="sm">
            {translations("generateOnly")}
          </SubmitButton>
        </form>

        <form
          action={sendToCustomEmailAction}
          className="flex items-center gap-2"
        >
          <input type="hidden" name="assessmentId" value={assessmentId} />
          <input type="hidden" name="portalPassword" value={password} />
          <Input
            type="email"
            name="customEmail"
            placeholder={translations("customEmailPlaceholder")}
            className="h-9 w-48"
          />
          <SubmitButton type="submit" variant="outline" size="sm">
            {translations("sendTo")}
          </SubmitButton>
        </form>
      </div>
    </>
  );
}
