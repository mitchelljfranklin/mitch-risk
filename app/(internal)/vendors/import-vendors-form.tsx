"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormToast } from "@/hooks/use-form-toast";
import {
  importVendorsAction,
  type VendorsImportState,
} from "@/lib/actions/vendors";

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
    <form action={formAction} className="inline-flex items-center gap-2">
      <Input
        type="file"
        name="file"
        accept=".csv"
        required
        className="w-56 cursor-pointer text-xs"
        onChange={handleFileChange}
      />
      <Button type="submit" disabled={isPending} size="sm" variant="outline">
        {isPending ? "Importing..." : "Import CSV"}
      </Button>
      {preview.length > 0 ? (
        <span className="text-muted-foreground text-xs">
          {rowCount} vendor{rowCount !== 1 ? "s" : ""} found
        </span>
      ) : null}
      {state && !state.ok ? (
        <p className="text-destructive text-xs">{state.error}</p>
      ) : null}
    </form>
  );
}
