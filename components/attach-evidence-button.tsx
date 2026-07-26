"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { attachEvidenceToCertificationAction } from "@/lib/actions/vendors";
import { getFrameworkOptionsAction } from "@/lib/actions/certifications";
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
  const [attachType, setAttachType] = useState<"certification" | "general">(
    "certification",
  );
  const [complianceEnabled, setComplianceEnabled] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState("");
  const [frameworkOptions, setFrameworkOptions] = useState<{ name: string }[]>(
    [],
  );
  const [state, formAction, isPending] = useActionState(
    attachEvidenceToCertificationAction,
    initialState,
  );
  useActionFeedback(state);

  useEffect(() => {
    if (attachType === "certification") {
      getFrameworkOptionsAction().then(setFrameworkOptions);
    }
  }, [attachType]);

  if (state?.ok && open) {
    return (
      <p className="text-muted-foreground text-xs">
        {state.message}. Refreshing…
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
      <input type="hidden" name="attachType" value={attachType} />
      <div className="grid gap-1.5">
        <Label className="text-xs">Attach as</Label>
        <Select
          value={attachType}
          onValueChange={(v) => setAttachType(v as typeof attachType)}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="certification">
              Certification / attestation
            </SelectItem>
            <SelectItem value="general">General attachment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {attachType === "certification" ? (
        <>
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

          {frameworkOptions.length > 0 ? (
            <div className="flex items-start gap-2">
              <Checkbox
                id={`compliance-${evidenceId}`}
                checked={complianceEnabled}
                onCheckedChange={(checked) =>
                  setComplianceEnabled(Boolean(checked))
                }
                className="mt-0.5"
              />
              <div className="grid flex-1 gap-1.5">
                <Label
                  htmlFor={`compliance-${evidenceId}`}
                  className="cursor-pointer text-xs font-normal"
                >
                  Compliance actions required
                </Label>
                {complianceEnabled ? (
                  <Select
                    name="frameworkName"
                    value={selectedFramework || undefined}
                    onValueChange={setSelectedFramework}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Select a framework..." />
                    </SelectTrigger>
                    <SelectContent>
                      {frameworkOptions.map((option) => (
                        <SelectItem key={option.name} value={option.name}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
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
        </>
      )}

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
          {isPending
            ? "Adding…"
            : attachType === "certification"
              ? "Add certification"
              : "Attach to vendor"}
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
