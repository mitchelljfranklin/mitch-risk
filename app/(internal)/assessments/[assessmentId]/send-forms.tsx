"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  generateLinkAction,
  sendAssessmentAction,
  sendToCustomEmailAction,
} from "@/lib/actions/assessments";

type SendFormsProps = {
  assessmentId: string;
};

export function SendForms({ assessmentId }: SendFormsProps) {
  const [password, setPassword] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="portalPassword">Portal password (optional)</Label>
        <Input
          id="portalPassword"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Require vendor to enter a password"
          className="w-72"
        />
        <p className="text-muted-foreground text-xs">
          If set, vendors must enter this password before accessing the
          questionnaire.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form action={sendAssessmentAction} className="flex items-center gap-2">
          <input type="hidden" name="assessmentId" value={assessmentId} />
          <input type="hidden" name="portalPassword" value={password} />
          <Button type="submit" size="sm">
            Send to vendor
          </Button>
        </form>

        <form action={generateLinkAction} className="flex items-center gap-2">
          <input type="hidden" name="assessmentId" value={assessmentId} />
          <input type="hidden" name="portalPassword" value={password} />
          <Button type="submit" variant="outline" size="sm">
            Generate link only
          </Button>
        </form>

        <form
          action={sendToCustomEmailAction}
          className="flex items-center gap-2"
        >
          <input type="hidden" name="assessmentId" value={assessmentId} />
          <input type="hidden" name="portalPassword" value={password} />
          <input
            name="customEmail"
            type="email"
            aria-label="Send to a custom email address"
            placeholder="custom@example.com"
            className="border-input bg-background h-9 w-48 rounded-md border px-3 text-xs"
          />
          <Button type="submit" variant="outline" size="sm">
            Send to
          </Button>
        </form>
      </div>
    </div>
  );
}
