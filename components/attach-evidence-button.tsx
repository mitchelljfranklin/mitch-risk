"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { attachEvidenceToVendorAction } from "@/lib/actions/vendors";
import { Paperclip } from "lucide-react";

export function AttachEvidenceButton({
  evidenceId,
  assessmentId,
  fileName,
}: {
  evidenceId: string;
  assessmentId: string;
  fileName: string;
}) {
  const [open, setOpen] = useState(false);

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
      action={attachEvidenceToVendorAction}
      className="border-muted mt-1 flex flex-col gap-2 rounded-md border p-3"
    >
      <input type="hidden" name="evidenceId" value={evidenceId} />
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <div className="grid gap-1.5">
        <Label htmlFor={`displayName-${evidenceId}`} className="text-xs">
          Display name
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
          placeholder="Why this was attached…"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" className="h-7 text-xs">
          Attach to vendor
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
