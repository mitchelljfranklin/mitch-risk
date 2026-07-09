"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, startTransition } from "react";

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
  "domain,code,title,guidance",
  '"Access Control","AC-01","Access Control Policy","Develop and maintain a formal access control policy that addresses purpose, scope, roles, responsibilities, and compliance."',
  '"Access Control","AC-02","Account Management","Account creation, modification, disabling, and removal must follow a documented process with management approval."',
  '"Awareness & Training","AT-01","Security Awareness Training","All personnel receive security awareness training within 30 days of hire and annually thereafter."',
  '"Risk Management","RM-01","Risk Assessment","Conduct a formal risk assessment annually to identify threats, vulnerabilities, and impacts to organisational assets."',
].join("\n");

const initialState: FrameworkImportState = { ok: false, message: "" };

export function FrameworkImportForm() {
  const router = useRouter();
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
        <CardTitle>Import framework from CSV</CardTitle>
      </CardHeader>
      <CardContent>
        <Stepper defaultValue="setup" className="flex flex-col gap-6">
          <StepperList className="mx-auto flex w-fit items-center gap-2">
            <StepperItem value="setup">
              <StepperTrigger className="flex flex-col items-center gap-1">
                <StepperIndicator className="flex size-8 items-center justify-center rounded-full border-2 text-sm font-medium" />
                <StepperLabel className="text-xs font-medium">
                  Setup &amp; Upload
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

          <StepperContent value="setup" className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Framework name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. PCI DSS"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                required
                placeholder="e.g. 4.0"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Brief description of the framework"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="csvFile">CSV file</Label>
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
                  Template
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
                CSV must have columns: <code>domain</code>, <code>code</code>,{" "}
                <code>title</code>, <code>guidance</code> (guidance is
                optional). Max 1 MB.
              </p>
            </div>

            {parsedRows.length > 0 ? (
              <div>
                <p className="text-muted-foreground mb-2 text-sm">
                  {parsedRows.length} control
                  {parsedRows.length !== 1 ? "s" : ""} found
                </p>
                <div className="max-h-64 overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Domain</TableHead>
                        <TableHead className="text-xs">Code</TableHead>
                        <TableHead className="text-xs">Title</TableHead>
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
                    Showing first 10 of {parsedRows.length} rows
                  </p>
                ) : null}
              </div>
            ) : null}

            <StepperNext asChild>
              <Button size="sm" className="w-fit" disabled={!canProceed}>
                Next →
              </Button>
            </StepperNext>
          </StepperContent>

          <StepperContent value="confirm" className="flex flex-col gap-4">
            <div className="rounded-md border p-4">
              <p className="text-sm">
                You are about to create framework{" "}
                <span className="font-semibold">{name}</span> v
                <span className="font-semibold">{version}</span> with{" "}
                <span className="font-semibold">
                  {parsedRows.length} control
                  {parsedRows.length !== 1 ? "s" : ""}
                </span>
                .
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
                  ← Back
                </Button>
              </StepperPrevious>
              <Button size="sm" disabled={pending} onClick={handleImport}>
                {pending ? "Importing…" : "Import framework"}
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
