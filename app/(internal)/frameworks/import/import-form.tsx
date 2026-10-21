"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, startTransition } from "react";
import { useTranslations } from "next-intl";

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
import { Textarea } from "@/components/ui/textarea";
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
import { parseCsvWithHeaders } from "@/lib/csv-parser";
import {
  importFrameworkAction,
  type FrameworkImportState,
} from "@/lib/actions/frameworks";
import { Download } from "lucide-react";

const CSV_TEMPLATE = [
  "domain,code,title,guidance,is_shared_responsibility",
  '"Access Control","AC-01","Access Control Policy","Develop and maintain a formal access control policy that addresses purpose, scope, roles, responsibilities, and compliance.","false"',
  '"Access Control","AC-02","Account Management","Account creation, modification, disabling, and removal must follow a documented process with management approval.","false"',
  '"Awareness & Training","AT-01","Security Awareness Training","All personnel receive security awareness training within 30 days of hire and annually thereafter.","false"',
  '"Risk Management","RM-01","Risk Assessment","Conduct a formal risk assessment annually to identify threats, vulnerabilities, and impacts to organisational assets.","true"',
].join("\n");

const initialState: FrameworkImportState = { ok: false, message: "" };

export function FrameworkImportForm() {
  const router = useRouter();
  const translations = useTranslations("Frameworks.import");
  const [state, formAction, pending] = useActionState(
    importFrameworkAction,
    initialState,
  );
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");
  const [rawText, setRawText] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);

  useEffect(() => {
    if (state.ok && state.frameworkId) {
      router.push(`/frameworks/${state.frameworkId}`);
    }
  }, [state.ok, state.frameworkId, router]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setRawText(text);
      setParsedRows(parseCsvWithHeaders(text));
    };
    reader.readAsText(file);
  }

  function handleImport() {
    if (!rawText) return;
    const blob = new Blob([rawText], { type: "text/csv;charset=utf-8" });
    const file = new File([blob], "framework.csv", { type: "text/csv" });
    const formData = new FormData();
    formData.set("name", name);
    formData.set("version", version);
    if (description) formData.set("description", description);
    formData.set("csvFile", file);
    startTransition(() => {
      formAction(formData);
    });
  }

  const canProceed =
    name.trim().length > 0 &&
    version.trim().length > 0 &&
    parsedRows.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{translations("cardTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Stepper defaultValue="setup" className="flex flex-col gap-6">
          <StepperList className="mx-auto flex w-fit items-center gap-2">
            <StepperItem value="setup">
              <StepperTrigger className="flex flex-col items-center gap-1">
                <StepperIndicator className="flex size-8 items-center justify-center rounded-full border-2 text-sm font-medium" />
                <StepperLabel className="text-xs font-medium">
                  {translations("steps.setup")}
                </StepperLabel>
              </StepperTrigger>
              <StepperSeparator className="bg-muted-foreground/20 mx-2 h-0.5 w-12" />
            </StepperItem>
            <StepperItem value="confirm">
              <StepperTrigger className="flex flex-col items-center gap-1">
                <StepperIndicator className="flex size-8 items-center justify-center rounded-full border-2 text-sm font-medium" />
                <StepperLabel className="text-xs font-medium">
                  {translations("steps.review")}
                </StepperLabel>
              </StepperTrigger>
            </StepperItem>
          </StepperList>

          <StepperContent value="setup" className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{translations("form.name")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                placeholder={translations("form.namePlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="version">{translations("form.version")}</Label>
              <Input
                id="version"
                value={version}
                onChange={(event) => setVersion(event.target.value)}
                required
                placeholder={translations("form.versionPlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">
                {translations("form.description")}
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                placeholder={translations("form.descriptionPlaceholder")}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="csvFile">{translations("form.csvFile")}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs"
                  onClick={() => {
                    const blob = new Blob([CSV_TEMPLATE], {
                      type: "text/csv;charset=utf-8",
                    });
                    const url = URL.createObjectURL(blob);
                    const anchor = document.createElement("a");
                    anchor.href = url;
                    anchor.download = "framework-template.csv";
                    anchor.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="size-3" />
                  {translations("form.downloadTemplate")}
                </Button>
              </div>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                required
                onChange={handleFileChange}
              />
              <p className="text-muted-foreground text-xs">
                {translations("form.csvHint")}
              </p>
            </div>

            {parsedRows.length > 0 ? (
              <div>
                <p className="text-muted-foreground mb-2 text-sm">
                  {translations("form.controlsFound", {
                    count: parsedRows.length,
                  })}
                </p>
                <div className="max-h-64 overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">
                          {translations("form.domain")}
                        </TableHead>
                        <TableHead className="text-xs">
                          {translations("form.code")}
                        </TableHead>
                        <TableHead className="text-xs">
                          {translations("form.titleColumn")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.slice(0, 10).map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="max-w-32 truncate text-xs">
                            {row.domain || "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.code || "—"}
                          </TableCell>
                          <TableCell className="max-w-48 truncate text-xs">
                            {row.title || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsedRows.length > 10 ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {translations("form.showingFirst", {
                      shown: 10,
                      total: parsedRows.length,
                    })}
                  </p>
                ) : null}
              </div>
            ) : null}

            <StepperNext asChild>
              <Button size="sm" className="w-fit" disabled={!canProceed}>
                {translations("form.next")}
              </Button>
            </StepperNext>
          </StepperContent>

          <StepperContent value="confirm" className="flex flex-col gap-4">
            <div className="rounded-md border p-4">
              <p className="text-sm">
                {translations("form.reviewIntro", {
                  name,
                  version,
                  count: parsedRows.length,
                })}
              </p>
              {description ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  {description}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <StepperPrevious asChild>
                <Button variant="outline" size="sm">
                  {translations("form.back")}
                </Button>
              </StepperPrevious>
              <Button size="sm" disabled={pending} onClick={handleImport}>
                {pending
                  ? translations("form.importing")
                  : translations("form.import")}
              </Button>
            </div>

            {!state.ok && state.message ? (
              <p className="text-destructive text-sm" role="alert">
                {state.message}
              </p>
            ) : null}
          </StepperContent>
        </Stepper>
      </CardContent>
    </Card>
  );
}
