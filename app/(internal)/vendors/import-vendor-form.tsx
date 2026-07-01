"use client";

import { useActionState, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  importVendorAction,
  type VendorImportState,
} from "@/lib/actions/vendors";
import { useFormToast } from "@/hooks/use-form-toast";

const initialState: VendorImportState = undefined;

export function ImportVendorForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    (previous: VendorImportState, data: FormData) => {
      const result = importVendorAction(previous, data);
      void result.then((r) => {
        if (r?.ok) formRef.current?.reset();
      });
      return result;
    },
    initialState,
  );
  useFormToast(state);

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-3">
      <Input
        type="file"
        name="file"
        accept=".json"
        disabled={isPending}
        required
      />
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? "Importing…" : "Import vendor"}
      </Button>
      {state?.error ? (
        <span className="text-destructive text-xs">{state.error}</span>
      ) : null}
      {state?.ok ? (
        <span className="text-muted-foreground text-xs">{state.message}</span>
      ) : null}
    </form>
  );
}
