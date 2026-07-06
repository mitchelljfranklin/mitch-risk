"use client";

import { useActionState, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormToast } from "@/hooks/use-form-toast";
import { Download } from "lucide-react";
import {
  importTemplateAction,
  type TemplateImportState,
} from "@/lib/actions/templates";

const JSON_TEMPLATE = JSON.stringify(
  {
    name: "My Template",
    description: "A custom security questionnaire.",
    sections: [
      {
        title: "Access Control",
        questions: [
          {
            text: "Is multi-factor authentication enforced for all remote access?",
            helpText: "Include VPN, RDP, and cloud console access.",
            type: "YES_NO",
            riskWeight: "HIGH",
            required: true,
            controlCodes: ["AC-01"],
          },
          {
            text: "How often are access rights reviewed?",
            type: "MULTIPLE_CHOICE",
            riskWeight: "MEDIUM",
            required: true,
            options: ["Monthly", "Quarterly", "Annually", "Never"],
            expectedAnswer: "Quarterly",
            controlCodes: ["AC-02"],
          },
        ],
      },
    ],
  },
  null,
  2,
);

const initialState: TemplateImportState = undefined;

export function ImportTemplateForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    (previous: TemplateImportState, data: FormData) => {
      const result = importTemplateAction(previous, data);
      void result.then((r) => {
        if (r?.ok) formRef.current?.reset();
      });
      return result;
    },
    initialState,
  );
  useFormToast(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload JSON</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="file">JSON file</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs"
                onClick={() => {
                  const blob = new Blob([JSON_TEMPLATE], {
                    type: "application/json;charset=utf-8",
                  });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "template-import-template.json";
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="size-3" />
                Template
              </Button>
            </div>
            <Input
              id="file"
              type="file"
              name="file"
              accept=".json"
              disabled={isPending}
              required
            />
            <p className="text-muted-foreground text-xs">
              Upload a valid JSON template file. You can export an existing
              template as JSON from the template builder (Actions → Export) to
              see the expected structure.
            </p>
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-fit"
            variant="outline"
          >
            {isPending ? "Importing…" : "Import template"}
          </Button>

          {state?.error ? (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          ) : null}
          {state?.ok ? (
            <p className="text-sm text-[var(--success)]">{state.message}</p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
