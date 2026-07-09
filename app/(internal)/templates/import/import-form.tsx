"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  startTransition,
} from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperLabel,
  StepperList,
  StepperNext,
  StepperPrevious,
  StepperSeparator,
  StepperTrigger,
} from "@/components/ui/stepper";
import { useFormToast } from "@/hooks/use-form-toast";
import {
  importTemplateAction,
  type TemplateImportState,
} from "@/lib/actions/templates";
import { Download } from "lucide-react";

type ParsedTemplate = {
  name: string;
  description?: string;
  sections: {
    title: string;
    questions: {
      text: string;
      type: string;
      riskWeight: string;
      required: boolean;
      controlCodes?: string[];
    }[];
  }[];
};

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
            controlCodes: ["A.5.15"],
          },
          {
            text: "How often are access rights reviewed?",
            type: "MULTIPLE_CHOICE",
            riskWeight: "MEDIUM",
            required: true,
            options: ["Monthly", "Quarterly", "Annually", "Never"],
            expectedAnswer: "Quarterly",
            controlCodes: ["A.5.18"],
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
  const router = useRouter();
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
  const [rawText, setRawText] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedTemplate | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  useFormToast(state);

  useEffect(() => {
    if (state?.ok) {
      router.push("/templates");
    }
  }, [state?.ok, router]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setRawText(text);
      setParseError(null);
      try {
        const template = JSON.parse(text) as ParsedTemplate;
        if (
          !template.name ||
          typeof template.name !== "string" ||
          !Array.isArray(template.sections)
        ) {
          setParseError(
            "Invalid template structure. Expected name and sections array.",
          );
          setParsed(null);
          return;
        }
        setParsed(template);
      } catch {
        setParseError("Invalid JSON file.");
        setParsed(null);
      }
    };
    reader.readAsText(file);
  }

  function handleImport() {
    if (!rawText) return;
    const blob = new Blob([rawText], {
      type: "application/json;charset=utf-8",
    });
    const file = new File([blob], "template.json", {
      type: "application/json",
    });
    const formData = new FormData();
    formData.set("file", file);
    startTransition(() => {
      formAction(formData);
    });
  }

  let totalQuestions = 0;
  let totalControls = 0;
  if (parsed) {
    for (const section of parsed.sections) {
      totalQuestions += section.questions.length;
      for (const question of section.questions) {
        totalControls += question.controlCodes?.length ?? 0;
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import template from JSON</CardTitle>
      </CardHeader>
      <CardContent>
        <Stepper defaultValue="upload" className="flex flex-col gap-6">
          <StepperList className="mx-auto flex w-fit items-center gap-2">
            <StepperItem value="upload">
              <StepperTrigger className="flex flex-col items-center gap-1">
                <StepperIndicator className="flex size-8 items-center justify-center rounded-full border-2 text-sm font-medium" />
                <StepperLabel className="text-xs font-medium">
                  Upload
                </StepperLabel>
              </StepperTrigger>
              <StepperSeparator className="bg-muted-foreground/20 mx-2 h-0.5 w-12" />
            </StepperItem>
            <StepperItem value="confirm">
              <StepperTrigger className="flex flex-col items-center gap-1">
                <StepperIndicator className="flex size-8 items-center justify-center rounded-full border-2 text-sm font-medium" />
                <StepperLabel className="text-xs font-medium">
                  Review
                </StepperLabel>
              </StepperTrigger>
            </StepperItem>
          </StepperList>

          <StepperContent value="upload" className="flex flex-col gap-4">
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
                    const anchor = document.createElement("a");
                    anchor.href = url;
                    anchor.download = "template-import-template.json";
                    anchor.click();
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
                accept=".json"
                onChange={handleFileChange}
                required
              />
              <p className="text-muted-foreground text-xs">
                Upload a valid JSON template file. Export an existing template
                from the template builder (Actions → Export) to see the expected
                structure.
              </p>
            </div>

            {parseError ? (
              <p className="text-destructive text-sm" role="alert">
                {parseError}
              </p>
            ) : null}

            {parsed ? (
              <div className="rounded-md border p-4">
                <p className="text-sm font-medium">{parsed.name}</p>
                {parsed.description ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {parsed.description}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {parsed.sections.length} section
                    {parsed.sections.length !== 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {totalQuestions} question
                    {totalQuestions !== 1 ? "s" : ""}
                  </Badge>
                  {totalControls > 0 ? (
                    <Badge variant="secondary" className="text-xs">
                      {totalControls} control code
                      {totalControls !== 1 ? "s" : ""}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-3 max-h-64 overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Section</TableHead>
                        <TableHead className="text-xs">Questions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsed.sections.map((section, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-xs">
                            {section.title}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {section.questions.length}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}

            <StepperNext asChild>
              <Button size="sm" className="w-fit" disabled={!parsed}>
                Next →
              </Button>
            </StepperNext>
          </StepperContent>

          <StepperContent value="confirm" className="flex flex-col gap-4">
            {parsed ? (
              <div className="rounded-md border p-4">
                <p className="text-sm">
                  You are about to import template{" "}
                  <span className="font-semibold">{parsed.name}</span>
                  {parsed.description ? (
                    <span className="text-muted-foreground">
                      {" "}
                      — {parsed.description}
                    </span>
                  ) : null}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {parsed.sections.length} section
                    {parsed.sections.length !== 1 ? "s" : ""} · {totalQuestions}{" "}
                    question
                    {totalQuestions !== 1 ? "s" : ""}
                    {totalControls > 0
                      ? ` · ${totalControls} control code${totalControls !== 1 ? "s" : ""}`
                      : ""}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <StepperPrevious asChild>
                <Button variant="outline" size="sm">
                  ← Back
                </Button>
              </StepperPrevious>
              <Button size="sm" disabled={isPending} onClick={handleImport}>
                {isPending ? "Importing…" : "Import template"}
              </Button>
            </div>

            {state?.error ? (
              <p className="text-destructive text-sm" role="alert">
                {state.error}
              </p>
            ) : null}
          </StepperContent>
        </Stepper>
      </CardContent>
    </Card>
  );
}
