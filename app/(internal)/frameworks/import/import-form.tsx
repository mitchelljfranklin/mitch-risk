"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download } from "lucide-react";
import {
  importFrameworkAction,
  type FrameworkImportState,
} from "@/lib/actions/frameworks";

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
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    importFrameworkAction,
    initialState,
  );

  useEffect(() => {
    if (state.ok && state.frameworkId) {
      router.push(`/frameworks/${state.frameworkId}`);
    }
  }, [state.ok, state.frameworkId, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Framework details</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Framework name</Label>
            <Input id="name" name="name" required placeholder="e.g. PCI DSS" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              name="version"
              required
              placeholder="e.g. 4.0"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
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
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "framework-template.csv";
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="size-3" />
                Template
              </Button>
            </div>
            <Input
              id="csvFile"
              name="csvFile"
              type="file"
              accept=".csv"
              required
            />
            <p className="text-muted-foreground text-xs">
              CSV must have columns: <code>domain</code>, <code>code</code>,{" "}
              <code>title</code>, <code>guidance</code> (guidance is optional).
              Max 1 MB.
            </p>
          </div>

          <Button type="submit" disabled={pending} className="w-fit">
            {pending ? "Importing…" : "Import framework"}
          </Button>

          {!state.ok && state.message ? (
            <p className="text-destructive text-sm" role="alert">
              {state.message}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
