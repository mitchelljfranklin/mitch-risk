"use client";

import { useState } from "react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { attachEvidenceToCertificationAction } from "@/lib/actions/vendors";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { Paperclip } from "lucide-react";

const initialState: { ok: boolean; message: string } | undefined = undefined;

export function AttachEvidenceButton({
  evidenceId,
  fileName,
}: {
  evidenceId: string;
  fileName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    attachEvidenceToCertificationAction,
    initialState,
  );
  useActionFeedback(state);

  // On success, close the inline form — the page will refresh via revalidatePath.
  if (state?.ok && open) {
    return (
      <p className="text-muted-foreground text-xs">
        Certification added. Refreshing…
      </p>
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-1.5 text-xs"
        onClick={() => setOpen(true)}
      >
        <Paperclip className="size-3" />
        Attach
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="border-muted mt-1 flex flex-col gap-2 rounded-md border p-3"
    >
      <input type="hidden" name="evidenceId" value={evidenceId} />
      <div className="grid gap-1.5">
        <Label htmlFor={`name-${evidenceId}`} className="text-xs">
          Certification name
        </Label>
        <Input
          id={`name-${evidenceId}`}
          name="name"
          required
          placeholder="e.g. SOC 2 Type II"
          className="h-7 text-xs"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`issuer-${evidenceId}`} className="text-xs">
          Issuer (optional)
        </Label>
        <Input
          id={`issuer-${evidenceId}`}
          name="issuer"
          placeholder="e.g. Audit firm"
          className="h-7 text-xs"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`expires-${evidenceId}`} className="text-xs">
          Expiry date
        </Label>
        <Input
          id={`expires-${evidenceId}`}
          name="expiresDate"
          type="date"
          required
          className="h-7 text-xs"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`displayName-${evidenceId}`} className="text-xs">
          Display name for file
        </Label>
        <Input
          id={`displayName-${evidenceId}`}
          name="displayName"
          defaultValue={fileName}
          className="h-7 text-xs"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`notes-${evidenceId}`} className="text-xs">
          Notes (optional)
        </Label>
        <Textarea
          id={`notes-${evidenceId}`}
          name="notes"
          rows={2}
          className="min-h-12 text-xs"
          placeholder="Additional context…"
        />
      </div>
      {state && !state.ok ? (
        <p className="text-destructive text-xs" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          size="sm"
          className="h-7 text-xs"
          disabled={isPending}
        >
          {isPending ? "Adding…" : "Add certification"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
