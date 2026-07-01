"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createTemplateAction, type FormState } from "@/lib/actions/templates";

const initialState: FormState = undefined;

export function NewTemplateForm() {
  const [state, formAction, isPending] = useActionState(
    createTemplateAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" />
      </div>
      {state?.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create template"}
        </Button>
        <Button asChild variant="outline">
          <Link href="/templates">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
