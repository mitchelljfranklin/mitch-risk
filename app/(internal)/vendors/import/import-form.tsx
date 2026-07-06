"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormToast } from "@/hooks/use-form-toast";
import { Download } from "lucide-react";
import {
  importVendorsAction,
  type VendorsImportState,
} from "@/lib/actions/vendors";

const CSV_TEMPLATE = [
  "name,contactname,contactemail,tier,website,notes,servicedescription,datasensitivity,contractrenewaldate",
  "Acme Corp,John Doe,john@acme.com,CRITICAL,https://acme.com,Our payment processor,Handles all payment processing,CONFIDENTIAL,2026-12-31",
  "Beta Ltd,Jane Smith,jane@beta.com,HIGH,https://beta.com,Cloud hosting provider,Infrastructure as a Service,INTERNAL,",
  "Gamma Inc,,admin@gamma.com,MEDIUM,,,Marketing analytics tool,PUBLIC,2026-06-15",
].join("\n");

export function ImportVendorsForm() {
  const [state, formAction, isPending] = useActionState(
    importVendorsAction,
    undefined as VendorsImportState,
  );
  const [preview, setPreview] = useState<string[]>([]);
  const [rowCount, setRowCount] = useState(0);
  useFormToast(state as { ok: boolean; message?: string } | undefined);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lines = text
        .trim()
        .split(/\r?\n/)
        .filter((l) => l.trim());
      setPreview(lines.slice(0, 5));
      setRowCount(Math.max(0, lines.length - 1));
    };
    reader.readAsText(file);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload CSV</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
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
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "vendor-import-template.csv";
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
              accept=".csv"
              required
              onChange={handleFileChange}
            />
            <p className="text-muted-foreground text-xs">
              CSV must have columns: <code>name</code>, <code>contactname</code>
              , <code>contactemail</code>, <code>tier</code>,{" "}
              <code>website</code>, <code>notes</code>,{" "}
              <code>servicedescription</code>, <code>datasensitivity</code>,{" "}
              <code>contractrenewaldate</code>. Only <code>name</code> and{" "}
              <code>contactemail</code> are required. Max 1 MB.
            </p>
          </div>

          {preview.length > 0 ? (
            <p className="text-muted-foreground text-sm">
              {rowCount} vendor{rowCount !== 1 ? "s" : ""} found
            </p>
          ) : null}

          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? "Importing…" : "Import vendors"}
          </Button>

          {state && !state.ok ? (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
