"use client";

import { useActionState, useState, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";

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
import { parseCsvWithHeaders } from "@/lib/csv-parser";
import {
  importVendorsAction,
  type VendorsImportState,
} from "@/lib/actions/vendors";
import { Download } from "lucide-react";

const CSV_TEMPLATE = [
  "id,name,externalid,contactname,contactemail,tier,website,notes,servicedescription,datasensitivity,contractrenewaldate,contractvalue,geographicrisk,tags",
  ",Acme Corp,ERP-V-001,John Doe,john@acme.com,CRITICAL,https://acme.com,Our payment processor,Handles all payment processing,CONFIDENTIAL,2026-12-31,HIGH,MEDIUM",
  ",Beta Ltd,ERP-V-002,Jane Smith,jane@beta.com,HIGH,https://beta.com,Cloud hosting provider,Infrastructure as a Service,INTERNAL,,MEDIUM,LOW",
  ",Gamma Inc,,,admin@gamma.com,MEDIUM,,,Marketing analytics tool,PUBLIC,2026-06-15,LOW,NONE",
].join("\n");

export function ImportVendorsForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    importVendorsAction,
    undefined as VendorsImportState,
  );
  const [rawText, setRawText] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);

  useFormToast(state as { ok: boolean; message?: string } | undefined);

  useEffect(() => {
    if (state?.ok) {
      router.push("/vendors");
    }
  }, [state?.ok, router]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setRawText(text);
      const rows = parseCsvWithHeaders(text);
      setParsedRows(rows);
      if (rows.length > 0) {
        setPreviewHeaders(Object.keys(rows[0]));
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!rawText) return;
    const blob = new Blob([rawText], { type: "text/csv;charset=utf-8" });
    const file = new File([blob], "import.csv", { type: "text/csv" });
    const formData = new FormData();
    formData.set("file", file);
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import vendors from CSV</CardTitle>
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
                <Label htmlFor="file">CSV file</Label>
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
                    anchor.download = "vendor-import-template.csv";
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
                accept=".csv"
                required
                onChange={handleFileChange}
              />
              <p className="text-muted-foreground text-xs">
                CSV must have columns: <code>id</code> (optional),{" "}
                <code>name</code>, <code>contactemail</code>, plus optional:{" "}
                <code>externalid</code>, <code>contactname</code>,{" "}
                <code>tier</code>, <code>website</code>, <code>notes</code>,{" "}
                <code>servicedescription</code>, <code>datasensitivity</code>,{" "}
                <code>contractrenewaldate</code>, <code>contractvalue</code>,{" "}
                <code>geographicrisk</code>, <code>tags</code>. Only{" "}
                <code>name</code> and <code>contactemail</code> are required.
                Max 1 MB. Include a vendor <code>id</code> or{" "}
                <code>externalid</code> to update an existing vendor instead of
                creating a new one.
              </p>
            </div>

            {parsedRows.length > 0 ? (
              <div>
                <p className="text-muted-foreground mb-2 text-sm">
                  {parsedRows.length} vendor
                  {parsedRows.length !== 1 ? "s" : ""} found
                </p>
                <div className="max-h-64 overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {previewHeaders.map((header) => (
                          <TableHead key={header} className="text-xs">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.slice(0, 10).map((row, index) => (
                        <TableRow key={index}>
                          {previewHeaders.map((header) => (
                            <TableCell
                              key={header}
                              className="max-w-32 truncate text-xs"
                            >
                              {row[header] || "—"}
                            </TableCell>
                          ))}
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
              <Button
                size="sm"
                className="w-fit"
                disabled={parsedRows.length === 0}
              >
                Next →
              </Button>
            </StepperNext>
          </StepperContent>

          <StepperContent value="confirm" className="flex flex-col gap-4">
            <div className="rounded-md border p-4">
              <p className="text-sm">
                You are about to import{" "}
                <span className="font-semibold">
                  {parsedRows.length} vendor
                  {parsedRows.length !== 1 ? "s" : ""}
                </span>
                .
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Some rows may be skipped if they fail validation (duplicate
                emails, missing required fields).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <StepperPrevious asChild>
                <Button variant="outline" size="sm">
                  ← Back
                </Button>
              </StepperPrevious>
              <Button size="sm" disabled={isPending} onClick={handleImport}>
                {isPending ? "Importing…" : "Import vendors"}
              </Button>
            </div>

            {state && !state.ok ? (
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
